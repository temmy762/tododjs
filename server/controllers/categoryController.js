import Category from '../models/Category.js';
import Track from '../models/Track.js';
import Mashup from '../models/Mashup.js';

// @desc    Get all active categories (public)
// @route   GET /api/categories
// @access  Public
export const getCategories = async (req, res) => {
  try {
    const includeInactive = req.query.all === 'true' && req.user?.role === 'admin';
    const filter = includeInactive ? {} : { isActive: true };
    const categories = await Category.find(filter).sort('sortOrder name').lean();

    // Attach live track counts
    const counts = await Track.aggregate([
      { $match: { status: 'published', category: { $ne: null } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const countMap = Object.fromEntries(counts.map(c => [c._id, c.count]));

    const data = categories.map(c => ({ ...c, trackCount: countMap[c.name] || 0 }));

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
export const seedCategories = async (req, res) => {
  const defaults = [
    { name: 'Intensa Music', color: '#EF4444', sortOrder: 1 },
    { name: 'Latin Box',     color: '#F59E0B', sortOrder: 2 },
    { name: 'DJ City',       color: '#10B981', sortOrder: 3 },
    { name: 'BPM Supreme',   color: '#3B82F6', sortOrder: 4 },
    { name: 'Heavy Hits',    color: '#8B5CF6', sortOrder: 5 },
    { name: 'Club Killers',  color: '#EC4899', sortOrder: 6 },
    { name: 'Franchise',     color: '#F97316', sortOrder: 7 },
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
