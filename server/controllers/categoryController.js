import Category from '../models/Category.js';
import Track from '../models/Track.js';
import Mashup from '../models/Mashup.js';

import { clearCategoryCache } from '../services/categoryDetection.js';

// @desc    Get all active categories (public)
// @route   GET /api/categories
// @access  Public
export const getCategories = async (req, res) => {
  try {
    const includeInactive = req.query.all === 'true' && req.user?.role === 'admin';
    const filter = includeInactive ? {} : { isActive: true };
    const categories = await Category.find(filter).sort('sortOrder name').lean();

    // Attach live track + mashup counts per category
    const [trackCounts, mashupCounts] = await Promise.all([
      Track.aggregate([
        { $match: { status: 'published', category: { $ne: null } } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Mashup.aggregate([
        { $match: { isPublished: true, category: { $nin: [null, 'Others', ''] } } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);
    const countMap = Object.fromEntries(trackCounts.map(c => [c._id, c.count]));
    const mashupCountMap = Object.fromEntries(mashupCounts.map(c => [c._id, c.count]));

    const data = categories.map(c => ({
      ...c,
      trackCount: (countMap[c.name] || 0) + (mashupCountMap[c.name] || 0)
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create a category
// @route   POST /api/categories
// @access  Admin
export const createCategory = async (req, res) => {
  try {
    const { name, description, thumbnail, color, sortOrder, isActive } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    const exists = await Category.findOne({ $or: [{ name }, { slug }] });
    if (exists) return res.status(400).json({ success: false, message: 'A category with that name already exists' });

    const category = await Category.create({
      name: name.trim(),
      slug,
      description: description || '',
      thumbnail: thumbnail || '',
      color: color || '#7C3AED',
      sortOrder: sortOrder ?? 0,
      isActive: isActive ?? true,
      createdBy: req.user.id
    });

    clearCategoryCache();
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Admin
export const updateCategory = async (req, res) => {
  try {
    const { name, description, thumbnail, color, sortOrder, isActive } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    if (name && name !== category.name) {
      // Regenerate slug when name changes
      const newSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      const exists = await Category.findOne({ $or: [{ name }, { slug: newSlug }], _id: { $ne: category._id } });
      if (exists) return res.status(400).json({ success: false, message: 'A category with that name already exists' });

      // Rename the category on all tracks too
      await Track.updateMany({ category: category.name }, { $set: { category: name.trim() } });

      category.name = name.trim();
      category.slug = newSlug;
    }

    if (description !== undefined) category.description = description;
    if (thumbnail !== undefined) category.thumbnail = thumbnail;
    if (color !== undefined) category.color = color;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
    clearCategoryCache();
    res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Admin
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    // Unset category on all tracks that reference it
    await Track.updateMany({ category: category.name }, { $set: { category: null } });

    await category.deleteOne();
    clearCategoryCache();
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get tracks for a specific category (by slug)
// @route   GET /api/categories/:slug/tracks
// @access  Public
export const getCategoryTracks = async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug, isActive: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const {
      search = '',
      sort = '-dateAdded',
      page = 1,
      limit = 30
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);
    const sortDir = sort.startsWith('-') ? -1 : 1;
    const sortField = sort.replace(/^-/, '');

    const match = { status: 'published', category: category.name };
    if (search) {
      match.$or = [
        { title: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } }
      ];
    }

    const [total, tracks] = await Promise.all([
      Track.countDocuments(match),
      Track.find(match)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    res.json({
      success: true,
      data: tracks,
      category,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Seed initial categories from the hardcoded list (admin utility)
// @route   POST /api/categories/seed
// @access  Admin
// @desc    Count of uncategorized tracks (for admin banner)
// @route   GET /api/categories/uncategorized/count
// @access  Admin
export const getUncategorizedCount = async (req, res) => {
  try {
    const count = await Track.countDocuments({ category: 'Others', categoryVerified: false });
    const rawAgg = await Track.aggregate([
      { $match: { category: 'Others', categoryRaw: { $ne: null } } },
      { $group: { _id: '$categoryRaw', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 200 }
    ]);

    // Strip date/number suffixes in JS and merge groups with same cleaned label
    const DATE_RE = /[\s_\-]+(?:\d{1,2}[-./]\d{1,2}[-./]\d{2,4}|\d{4}[-./]\d{1,2}[-./]\d{1,2}|\d{8}|\b20\d{2}\b)[\s\w.,:\-]*$/i;
    const merged = new Map();
    for (const { _id, count } of rawAgg) {
      const cleaned = _id.replace(DATE_RE, '').trim();
      const key = cleaned.toLowerCase();
      if (!key) continue;
      if (merged.has(key)) {
        merged.get(key).count += count;
      } else {
        merged.set(key, { _id: cleaned, count });
      }
    }
    const rawLabels = [...merged.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 25);
    res.json({ success: true, count, rawLabels });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get paginated uncategorized tracks
// @route   GET /api/categories/uncategorized/tracks
// @access  Admin
export const getUncategorizedTracks = async (req, res) => {
  try {
    const { page = 1, limit = 50, rawLabel } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let match;
    if (rawLabel) {
      // Regex prefix match: the stored categoryRaw may have a date suffix that was
      // stripped when building the cleaned label shown in the UI, so we match anything
      // that STARTS WITH the cleaned label (case-insensitive).
      const escaped = rawLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match = {
        category: 'Others',
        categoryRaw: { $regex: `^${escaped}`, $options: 'i' },
      };
    } else {
      // No label filter — show all unverified 'Others' tracks
      match = { category: 'Others', categoryVerified: false };
    }
    const [total, tracks] = await Promise.all([
      Track.countDocuments(match),
      Track.find(match)
        .sort('-dateAdded')
        .skip(skip)
        .limit(parseInt(limit))
        .select('title artist categoryRaw dateAdded coverArt')
        .lean()
    ]);
    res.json({ success: true, data: tracks, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Bulk-assign category to tracks
// @route   POST /api/categories/bulk-assign
// @access  Admin
export const bulkAssignCategory = async (req, res) => {
  try {
    const { trackIds, categoryName } = req.body;
    if (!trackIds?.length || !categoryName) {
      return res.status(400).json({ success: false, message: 'trackIds and categoryName are required' });
    }
    const category = await Category.findOne({ name: categoryName });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const result = await Track.updateMany(
      { _id: { $in: trackIds } },
      { $set: { category: categoryName, categoryVerified: true } }
    );
    res.json({ success: true, updated: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const seedCategories = async (req, res) => {
  const defaults = [
    { name: 'Intensa Music', color: '#EF4444', sortOrder: 1 },
    { name: 'Latin Box',     color: '#F59E0B', sortOrder: 2 },
    { name: 'DJ City',       color: '#10B981', sortOrder: 3 },
    { name: 'BPM Supreme',   color: '#3B82F6', sortOrder: 4 },
    { name: 'Heavy Hits',    color: '#8B5CF6', sortOrder: 5 },
    { name: 'Club Killers',  color: '#EC4899', sortOrder: 6 },
    { name: 'Franchise',     color: '#F97316', sortOrder: 7 },
    { name: 'Reggaeton',     color: '#06B6D4', sortOrder: 8 },
  ];

  try {
    const created = [];
    for (const d of defaults) {
      const slug = d.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const exists = await Category.findOne({ slug });
      if (!exists) {
        const cat = await Category.create({ ...d, slug, createdBy: req.user.id });
        created.push(cat);
      }
    }
    res.json({ success: true, created: created.length, message: `${created.length} categories seeded` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
