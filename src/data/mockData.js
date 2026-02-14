const camelotTonalities = [
  '1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A', '10A', '11A', '12A',
  '1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B', '10B', '11B', '12B'
];

const mockTracksRaw = [
  {
    id: 1,
    title: "Midnight Drive",
    artist: "The Synthwave Collective",
    bpm: 128,
    dateAdded: "2024-12-28",
    collection: "New Releases",
    coverArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 2,
    title: "Neon Lights",
    artist: "Digital Dreams",
    bpm: 132,
    dateAdded: "2024-12-27",
    collection: "Trending",
    coverArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 3,
    title: "Deep House Vibes",
    artist: "Groove Masters",
    bpm: 124,
    dateAdded: "2024-12-26",
    collection: "Deep House",
    coverArt: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 4,
    title: "Techno Pulse",
    artist: "Underground Sound",
    bpm: 140,
    dateAdded: "2024-12-25",
    collection: "Techno",
    coverArt: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop",
    locked: true
  },
  {
    id: 5,
    title: "Summer Breeze",
    artist: "Tropical Beats",
    bpm: 118,
    dateAdded: "2024-12-24",
    collection: "Chill",
    coverArt: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 6,
    title: "Bass Drop",
    artist: "Heavy Hitters",
    bpm: 150,
    dateAdded: "2024-12-23",
    collection: "Dubstep",
    coverArt: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 7,
    title: "Jazz Fusion",
    artist: "Modern Jazz Quartet",
    bpm: 110,
    dateAdded: "2024-12-22",
    collection: "Jazz",
    coverArt: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop",
    locked: true
  },
  {
    id: 8,
    title: "Ambient Space",
    artist: "Cosmic Sounds",
    bpm: 90,
    dateAdded: "2024-12-21",
    collection: "Ambient",
    coverArt: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 9,
    title: "Electro Swing",
    artist: "Vintage Future",
    bpm: 126,
    dateAdded: "2024-12-20",
    collection: "Electro Swing",
    coverArt: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 10,
    title: "Progressive Trance",
    artist: "Euphoria",
    bpm: 138,
    dateAdded: "2024-12-19",
    collection: "Trance",
    coverArt: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 11,
    title: "Urban Rhythm",
    artist: "City Beats",
    bpm: 95,
    dateAdded: "2024-12-18",
    collection: "Hip-Hop",
    coverArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 12,
    title: "Sunset Melody",
    artist: "Tropical Beats",
    bpm: 115,
    dateAdded: "2024-12-17",
    collection: "Chill",
    coverArt: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 13,
    title: "Electric Dreams",
    artist: "Digital Dreams",
    bpm: 130,
    dateAdded: "2024-12-16",
    collection: "Trending",
    coverArt: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 14,
    title: "Dark Matter",
    artist: "Underground Sound",
    bpm: 145,
    dateAdded: "2024-12-15",
    collection: "Techno",
    coverArt: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 15,
    title: "Smooth Operator",
    artist: "Modern Jazz Quartet",
    bpm: 105,
    dateAdded: "2024-12-14",
    collection: "Jazz",
    coverArt: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 16,
    title: "Cosmic Voyage",
    artist: "Cosmic Sounds",
    bpm: 88,
    dateAdded: "2024-12-13",
    collection: "Ambient",
    coverArt: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 17,
    title: "Retro Funk",
    artist: "Vintage Future",
    bpm: 120,
    dateAdded: "2024-12-12",
    collection: "Electro Swing",
    coverArt: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 18,
    title: "Night Drive",
    artist: "The Synthwave Collective",
    bpm: 125,
    dateAdded: "2024-12-11",
    collection: "New Releases",
    coverArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 19,
    title: "Bass Thunder",
    artist: "Heavy Hitters",
    bpm: 148,
    dateAdded: "2024-12-10",
    collection: "Dubstep",
    coverArt: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 20,
    title: "Euphoric State",
    artist: "Euphoria",
    bpm: 136,
    dateAdded: "2024-12-09",
    collection: "Trance",
    coverArt: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 21,
    title: "Morning Groove",
    artist: "Groove Masters",
    bpm: 122,
    dateAdded: "2024-12-08",
    collection: "Deep House",
    coverArt: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 22,
    title: "Crystal Clear",
    artist: "Digital Dreams",
    bpm: 128,
    dateAdded: "2024-12-07",
    collection: "Trending",
    coverArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 23,
    title: "Island Vibes",
    artist: "Tropical Beats",
    bpm: 112,
    dateAdded: "2024-12-06",
    collection: "Chill",
    coverArt: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 24,
    title: "Underground Anthem",
    artist: "Underground Sound",
    bpm: 142,
    dateAdded: "2024-12-05",
    collection: "Techno",
    coverArt: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 25,
    title: "Midnight Jazz",
    artist: "Modern Jazz Quartet",
    bpm: 98,
    dateAdded: "2024-12-04",
    collection: "Jazz",
    coverArt: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 26,
    title: "Stellar Dreams",
    artist: "Cosmic Sounds",
    bpm: 85,
    dateAdded: "2024-12-03",
    collection: "Ambient",
    coverArt: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 27,
    title: "Swing Time",
    artist: "Vintage Future",
    bpm: 124,
    dateAdded: "2024-12-02",
    collection: "Electro Swing",
    coverArt: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 28,
    title: "Neon Highway",
    artist: "The Synthwave Collective",
    bpm: 127,
    dateAdded: "2024-12-01",
    collection: "New Releases",
    coverArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 29,
    title: "Heavy Drop",
    artist: "Heavy Hitters",
    bpm: 152,
    dateAdded: "2024-11-30",
    collection: "Dubstep",
    coverArt: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 30,
    title: "Trance Nation",
    artist: "Euphoria",
    bpm: 140,
    dateAdded: "2024-11-29",
    collection: "Trance",
    coverArt: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 31,
    title: "Deep Dive",
    artist: "Groove Masters",
    bpm: 120,
    dateAdded: "2024-11-28",
    collection: "Deep House",
    coverArt: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 32,
    title: "Digital Paradise",
    artist: "Digital Dreams",
    bpm: 134,
    dateAdded: "2024-11-27",
    collection: "Trending",
    coverArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 33,
    title: "Beach Sunset",
    artist: "Tropical Beats",
    bpm: 110,
    dateAdded: "2024-11-26",
    collection: "Chill",
    coverArt: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 34,
    title: "Industrial Beat",
    artist: "Underground Sound",
    bpm: 138,
    dateAdded: "2024-11-25",
    collection: "Techno",
    coverArt: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 35,
    title: "Blue Note",
    artist: "Modern Jazz Quartet",
    bpm: 102,
    dateAdded: "2024-11-24",
    collection: "Jazz",
    coverArt: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 36,
    title: "Nebula",
    artist: "Cosmic Sounds",
    bpm: 92,
    dateAdded: "2024-11-23",
    collection: "Ambient",
    coverArt: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 37,
    title: "Charleston Remix",
    artist: "Vintage Future",
    bpm: 128,
    dateAdded: "2024-11-22",
    collection: "Electro Swing",
    coverArt: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 38,
    title: "Retrowave",
    artist: "The Synthwave Collective",
    bpm: 126,
    dateAdded: "2024-11-21",
    collection: "New Releases",
    coverArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 39,
    title: "Wobble Bass",
    artist: "Heavy Hitters",
    bpm: 146,
    dateAdded: "2024-11-20",
    collection: "Dubstep",
    coverArt: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 40,
    title: "Uplifting Melody",
    artist: "Euphoria",
    bpm: 135,
    dateAdded: "2024-11-19",
    collection: "Trance",
    coverArt: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 41,
    title: "Groove Session",
    artist: "Groove Masters",
    bpm: 123,
    dateAdded: "2024-11-18",
    collection: "Deep House",
    coverArt: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 42,
    title: "Pixel Dreams",
    artist: "Digital Dreams",
    bpm: 131,
    dateAdded: "2024-11-17",
    collection: "Trending",
    coverArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 43,
    title: "Ocean Breeze",
    artist: "Tropical Beats",
    bpm: 116,
    dateAdded: "2024-11-16",
    collection: "Chill",
    coverArt: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 44,
    title: "Warehouse Rave",
    artist: "Underground Sound",
    bpm: 144,
    dateAdded: "2024-11-15",
    collection: "Techno",
    coverArt: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 45,
    title: "Sax Appeal",
    artist: "Modern Jazz Quartet",
    bpm: 108,
    dateAdded: "2024-11-14",
    collection: "Jazz",
    coverArt: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 46,
    title: "Interstellar",
    artist: "Cosmic Sounds",
    bpm: 87,
    dateAdded: "2024-11-13",
    collection: "Ambient",
    coverArt: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 47,
    title: "Vintage Groove",
    artist: "Vintage Future",
    bpm: 122,
    dateAdded: "2024-11-12",
    collection: "Electro Swing",
    coverArt: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 48,
    title: "Cyber City",
    artist: "The Synthwave Collective",
    bpm: 129,
    dateAdded: "2024-11-11",
    collection: "New Releases",
    coverArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 49,
    title: "Sub Frequency",
    artist: "Heavy Hitters",
    bpm: 149,
    dateAdded: "2024-11-10",
    collection: "Dubstep",
    coverArt: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 50,
    title: "Eternal Sunrise",
    artist: "Euphoria",
    bpm: 137,
    dateAdded: "2024-11-09",
    collection: "Trance",
    coverArt: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 51,
    title: "Rhythm of the Night",
    artist: "City Beats",
    bpm: 128,
    dateAdded: "2024-11-08",
    collection: "House",
    coverArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 52,
    title: "Solar Flare",
    artist: "Cosmic Sounds",
    bpm: 140,
    dateAdded: "2024-11-07",
    collection: "Techno",
    coverArt: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 53,
    title: "Velvet Dreams",
    artist: "Modern Jazz Quartet",
    bpm: 95,
    dateAdded: "2024-11-06",
    collection: "Jazz",
    coverArt: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 54,
    title: "Electric Avenue",
    artist: "Digital Dreams",
    bpm: 132,
    dateAdded: "2024-11-05",
    collection: "Electro",
    coverArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 55,
    title: "Sunset Boulevard",
    artist: "Tropical Beats",
    bpm: 118,
    dateAdded: "2024-11-04",
    collection: "Chill",
    coverArt: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 56,
    title: "Thunder Strike",
    artist: "Heavy Hitters",
    bpm: 150,
    dateAdded: "2024-11-03",
    collection: "Dubstep",
    coverArt: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 57,
    title: "Moonlight Serenade",
    artist: "Vintage Future",
    bpm: 110,
    dateAdded: "2024-11-02",
    collection: "Lounge",
    coverArt: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 58,
    title: "Pulse Wave",
    artist: "The Synthwave Collective",
    bpm: 126,
    dateAdded: "2024-11-01",
    collection: "Synthwave",
    coverArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 59,
    title: "Deep Waters",
    artist: "Groove Masters",
    bpm: 121,
    dateAdded: "2024-10-31",
    collection: "Deep House",
    coverArt: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 60,
    title: "Skyline",
    artist: "Underground Sound",
    bpm: 143,
    dateAdded: "2024-10-30",
    collection: "Techno",
    coverArt: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 61,
    title: "Golden Hour",
    artist: "Tropical Beats",
    bpm: 115,
    dateAdded: "2024-10-29",
    collection: "Chill",
    coverArt: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 62,
    title: "Neon Pulse",
    artist: "Digital Dreams",
    bpm: 130,
    dateAdded: "2024-10-28",
    collection: "Electro",
    coverArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 63,
    title: "Frequency Shift",
    artist: "Heavy Hitters",
    bpm: 148,
    dateAdded: "2024-10-27",
    collection: "Dubstep",
    coverArt: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 64,
    title: "Starlight",
    artist: "Cosmic Sounds",
    bpm: 90,
    dateAdded: "2024-10-26",
    collection: "Ambient",
    coverArt: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 65,
    title: "Midnight Express",
    artist: "The Synthwave Collective",
    bpm: 128,
    dateAdded: "2024-10-25",
    collection: "Synthwave",
    coverArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 66,
    title: "Groove Theory",
    artist: "Groove Masters",
    bpm: 124,
    dateAdded: "2024-10-24",
    collection: "Deep House",
    coverArt: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 67,
    title: "Trance Formation",
    artist: "Euphoria",
    bpm: 138,
    dateAdded: "2024-10-23",
    collection: "Trance",
    coverArt: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 68,
    title: "Urban Jungle",
    artist: "City Beats",
    bpm: 100,
    dateAdded: "2024-10-22",
    collection: "Hip-Hop",
    coverArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 69,
    title: "Smooth Jazz",
    artist: "Modern Jazz Quartet",
    bpm: 105,
    dateAdded: "2024-10-21",
    collection: "Jazz",
    coverArt: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 70,
    title: "Paradise Lost",
    artist: "Tropical Beats",
    bpm: 112,
    dateAdded: "2024-10-20",
    collection: "Chill",
    coverArt: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 71,
    title: "Bass Revolution",
    artist: "Heavy Hitters",
    bpm: 145,
    dateAdded: "2024-10-19",
    collection: "Dubstep",
    coverArt: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 72,
    title: "Time Warp",
    artist: "Vintage Future",
    bpm: 125,
    dateAdded: "2024-10-18",
    collection: "Electro Swing",
    coverArt: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 73,
    title: "Digital Frontier",
    artist: "Digital Dreams",
    bpm: 133,
    dateAdded: "2024-10-17",
    collection: "Electro",
    coverArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 74,
    title: "Cosmic Dance",
    artist: "Cosmic Sounds",
    bpm: 88,
    dateAdded: "2024-10-16",
    collection: "Ambient",
    coverArt: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 75,
    title: "Night Rider",
    artist: "The Synthwave Collective",
    bpm: 127,
    dateAdded: "2024-10-15",
    collection: "Synthwave",
    coverArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 76,
    title: "House Party",
    artist: "Groove Masters",
    bpm: 122,
    dateAdded: "2024-10-14",
    collection: "Deep House",
    coverArt: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 77,
    title: "Techno City",
    artist: "Underground Sound",
    bpm: 141,
    dateAdded: "2024-10-13",
    collection: "Techno",
    coverArt: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 78,
    title: "Euphoric Nights",
    artist: "Euphoria",
    bpm: 136,
    dateAdded: "2024-10-12",
    collection: "Trance",
    coverArt: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 79,
    title: "Tropical Storm",
    artist: "Tropical Beats",
    bpm: 117,
    dateAdded: "2024-10-11",
    collection: "Chill",
    coverArt: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 80,
    title: "Heavy Metal",
    artist: "Heavy Hitters",
    bpm: 147,
    dateAdded: "2024-10-10",
    collection: "Dubstep",
    coverArt: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 81,
    title: "Jazz Fusion 2.0",
    artist: "Modern Jazz Quartet",
    bpm: 108,
    dateAdded: "2024-10-09",
    collection: "Jazz",
    coverArt: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 82,
    title: "Vintage Soul",
    artist: "Vintage Future",
    bpm: 120,
    dateAdded: "2024-10-08",
    collection: "Electro Swing",
    coverArt: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 83,
    title: "Digital Love",
    artist: "Digital Dreams",
    bpm: 129,
    dateAdded: "2024-10-07",
    collection: "Electro",
    coverArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 84,
    title: "Space Odyssey",
    artist: "Cosmic Sounds",
    bpm: 92,
    dateAdded: "2024-10-06",
    collection: "Ambient",
    coverArt: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 85,
    title: "Retro Wave",
    artist: "The Synthwave Collective",
    bpm: 125,
    dateAdded: "2024-10-05",
    collection: "Synthwave",
    coverArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 86,
    title: "Deep Groove",
    artist: "Groove Masters",
    bpm: 123,
    dateAdded: "2024-10-04",
    collection: "Deep House",
    coverArt: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 87,
    title: "Underground Pulse",
    artist: "Underground Sound",
    bpm: 139,
    dateAdded: "2024-10-03",
    collection: "Techno",
    coverArt: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 88,
    title: "Trance Energy",
    artist: "Euphoria",
    bpm: 137,
    dateAdded: "2024-10-02",
    collection: "Trance",
    coverArt: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 89,
    title: "Island Dreams",
    artist: "Tropical Beats",
    bpm: 114,
    dateAdded: "2024-10-01",
    collection: "Chill",
    coverArt: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 90,
    title: "Bass Drop Zone",
    artist: "Heavy Hitters",
    bpm: 149,
    dateAdded: "2024-09-30",
    collection: "Dubstep",
    coverArt: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 91,
    title: "Smooth Operator 2.0",
    artist: "Modern Jazz Quartet",
    bpm: 103,
    dateAdded: "2024-09-29",
    collection: "Jazz",
    coverArt: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 92,
    title: "Swing Revival",
    artist: "Vintage Future",
    bpm: 126,
    dateAdded: "2024-09-28",
    collection: "Electro Swing",
    coverArt: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 93,
    title: "Electric Soul",
    artist: "Digital Dreams",
    bpm: 131,
    dateAdded: "2024-09-27",
    collection: "Electro",
    coverArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 94,
    title: "Nebula Dreams",
    artist: "Cosmic Sounds",
    bpm: 86,
    dateAdded: "2024-09-26",
    collection: "Ambient",
    coverArt: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 95,
    title: "Neon Nights",
    artist: "The Synthwave Collective",
    bpm: 128,
    dateAdded: "2024-09-25",
    collection: "Synthwave",
    coverArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 96,
    title: "House Nation",
    artist: "Groove Masters",
    bpm: 124,
    dateAdded: "2024-09-24",
    collection: "Deep House",
    coverArt: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 97,
    title: "Techno Warrior",
    artist: "Underground Sound",
    bpm: 142,
    dateAdded: "2024-09-23",
    collection: "Techno",
    coverArt: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 98,
    title: "Euphoric State 2.0",
    artist: "Euphoria",
    bpm: 135,
    dateAdded: "2024-09-22",
    collection: "Trance",
    coverArt: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 99,
    title: "Paradise Found",
    artist: "Tropical Beats",
    bpm: 116,
    dateAdded: "2024-09-21",
    collection: "Chill",
    coverArt: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop",
    locked: false
  },
  {
    id: 100,
    title: "Final Drop",
    artist: "Heavy Hitters",
    bpm: 151,
    dateAdded: "2024-09-20",
    collection: "Dubstep",
    coverArt: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop",
    locked: false
  }
];

const genreMap = {
  'New Releases': 'House',
  'New This Week': 'House',
  'Trending': 'House',
  'Top Downloads': 'House',
  'Deep House': 'House',
  'Tech House': 'House',
  'Techno': 'Techno',
  'Chill': 'Ambient',
  'Hip-Hop': 'Hip-Hop',
  'Jazz': 'Jazz',
  'Ambient': 'Ambient',
  'Electro Swing': 'House',
  'Dubstep': 'Dubstep',
  'Trance': 'Trance',
  'Afro House': 'House',
  'Amapiano': 'House'
};

const poolNames = ['DJ Pool Pro', 'BPM Supreme', 'DJcity', 'Heavy Hits', 'Franchise Pool'];

export const mockTracks = mockTracksRaw.map((track, index) => ({
  ...track,
  tonality: camelotTonalities[index % camelotTonalities.length],
  genre: genreMap[track.collection] || 'House',
  pool: poolNames[index % poolNames.length]
}));

export const artistsAndLabels = [
  {
    id: 1,
    name: "Synthwave Collective",
    type: "artist",
    avatar: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop",
    hasNewContent: true,
    trackCount: 24
  },
  {
    id: 2,
    name: "Digital Dreams",
    type: "artist",
    avatar: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&h=200&fit=crop",
    hasNewContent: true,
    trackCount: 18
  },
  {
    id: 3,
    name: "Groove Masters",
    type: "artist",
    avatar: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop",
    hasNewContent: false,
    trackCount: 32
  },
  {
    id: 4,
    name: "Underground Sound",
    type: "label",
    avatar: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=200&h=200&fit=crop",
    hasNewContent: true,
    trackCount: 156
  },
  {
    id: 5,
    name: "Tropical Beats",
    type: "artist",
    avatar: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=200&h=200&fit=crop",
    hasNewContent: true,
    trackCount: 21
  },
  {
    id: 6,
    name: "Heavy Hitters",
    type: "label",
    avatar: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=200&h=200&fit=crop",
    hasNewContent: false,
    trackCount: 89
  },
  {
    id: 7,
    name: "Modern Jazz Quartet",
    type: "artist",
    avatar: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=200&h=200&fit=crop",
    hasNewContent: true,
    trackCount: 45
  },
  {
    id: 8,
    name: "Cosmic Sounds",
    type: "label",
    avatar: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=200&h=200&fit=crop",
    hasNewContent: false,
    trackCount: 67
  },
  {
    id: 9,
    name: "Vintage Future",
    type: "artist",
    avatar: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&h=200&fit=crop",
    hasNewContent: true,
    trackCount: 28
  },
  {
    id: 10,
    name: "Euphoria Records",
    type: "label",
    avatar: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=200&h=200&fit=crop",
    hasNewContent: true,
    trackCount: 134
  },
  {
    id: 11,
    name: "Neon Pulse",
    type: "artist",
    avatar: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop&sat=-100",
    hasNewContent: true,
    trackCount: 37
  },
  {
    id: 12,
    name: "Bass Factory",
    type: "label",
    avatar: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop&sat=-50",
    hasNewContent: false,
    trackCount: 112
  }
];

export const contentRows = [
  {
    id: "new-this-week",
    title: "New This Week",
    tracks: mockTracks.slice(0, 6)
  },
  {
    id: "trending",
    title: "Trending",
    tracks: [...mockTracks].sort(() => Math.random() - 0.5).slice(0, 6)
  },
  {
    id: "deep-house",
    title: "Deep House",
    tracks: mockTracks.filter(t => t.bpm >= 120 && t.bpm <= 128)
  },
  {
    id: "high-energy",
    title: "High Energy (130+ BPM)",
    tracks: mockTracks.filter(t => t.bpm >= 130)
  },
  {
    id: "chill-vibes",
    title: "Chill Vibes",
    tracks: mockTracks.filter(t => t.bpm < 120)
  },
  {
    id: "recently-added",
    title: "Recently Added",
    tracks: [...mockTracks].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
  }
];

export const albums = [
  {
    id: 1,
    title: "Midnight Chronicles",
    artist: "The Synthwave Collective",
    coverArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    trackCount: 12,
    year: 2024,
    releaseDate: "2024-12-15",
    isNew: true
  },
  {
    id: 2,
    title: "Digital Horizons",
    artist: "Digital Dreams",
    coverArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    trackCount: 10,
    year: 2024,
    releaseDate: "2024-12-10",
    isNew: true
  },
  {
    id: 3,
    title: "Deep Grooves Vol. 2",
    artist: "Groove Masters",
    coverArt: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop",
    trackCount: 14,
    year: 2024,
    releaseDate: "2024-11-20",
    isNew: false
  },
  {
    id: 4,
    title: "Underground Anthems",
    artist: "Underground Sound",
    coverArt: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop",
    trackCount: 16,
    year: 2024,
    releaseDate: "2024-12-05",
    isNew: true
  },
  {
    id: 5,
    title: "Tropical Paradise",
    artist: "Tropical Beats",
    coverArt: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop",
    trackCount: 11,
    year: 2024,
    releaseDate: "2024-12-01",
    isNew: true
  },
  {
    id: 6,
    title: "Bass Warfare",
    artist: "Heavy Hitters",
    coverArt: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop",
    trackCount: 13,
    year: 2024,
    releaseDate: "2024-10-15",
    isNew: false
  },
  {
    id: 7,
    title: "Jazz Nights",
    artist: "Modern Jazz Quartet",
    coverArt: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop",
    trackCount: 9,
    year: 2024,
    releaseDate: "2024-11-28",
    isNew: true
  },
  {
    id: 8,
    title: "Cosmic Journey",
    artist: "Cosmic Sounds",
    coverArt: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=400&fit=crop",
    trackCount: 8,
    year: 2024,
    releaseDate: "2024-09-10",
    isNew: false
  },
  {
    id: 9,
    title: "Vintage Vibes",
    artist: "Vintage Future",
    coverArt: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop",
    trackCount: 12,
    year: 2024,
    releaseDate: "2024-11-15",
    isNew: true
  },
  {
    id: 10,
    title: "Euphoric Dreams",
    artist: "Euphoria",
    coverArt: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&h=400&fit=crop",
    trackCount: 15,
    year: 2024,
    releaseDate: "2024-12-20",
    isNew: true
  },
  {
    id: 11,
    title: "Neon Pulse",
    artist: "City Beats",
    coverArt: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop&hue=180",
    trackCount: 11,
    year: 2024,
    releaseDate: "2024-11-05",
    isNew: true
  },
  {
    id: 12,
    title: "Techno Revolution",
    artist: "Underground Sound",
    coverArt: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop&hue=270",
    trackCount: 13,
    year: 2023,
    releaseDate: "2023-08-20",
    isNew: false
  },
  {
    id: 13,
    title: "Ambient Spaces",
    artist: "Cosmic Sounds",
    coverArt: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=400&fit=crop&hue=200",
    trackCount: 10,
    year: 2024,
    releaseDate: "2024-10-25",
    isNew: true
  },
  {
    id: 14,
    title: "House Nation Vol. 3",
    artist: "Groove Masters",
    coverArt: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop&hue=120",
    trackCount: 14,
    year: 2024,
    releaseDate: "2024-09-15",
    isNew: false
  },
  {
    id: 15,
    title: "Retro Wave Collection",
    artist: "The Synthwave Collective",
    coverArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop&hue=300",
    trackCount: 12,
    year: 2023,
    releaseDate: "2023-06-10",
    isNew: false
  },
  {
    id: 16,
    title: "Dubstep Mayhem",
    artist: "Heavy Hitters",
    coverArt: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop&hue=0",
    trackCount: 15,
    year: 2024,
    releaseDate: "2024-11-10",
    isNew: true
  },
  {
    id: 17,
    title: "Smooth Jazz Sessions",
    artist: "Modern Jazz Quartet",
    coverArt: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop&hue=40",
    trackCount: 10,
    year: 2024,
    releaseDate: "2024-10-05",
    isNew: true
  },
  {
    id: 18,
    title: "Electro Fusion",
    artist: "Digital Dreams",
    coverArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&hue=180",
    trackCount: 11,
    year: 2024,
    releaseDate: "2024-08-20",
    isNew: false
  },
  {
    id: 19,
    title: "Tropical Sunset",
    artist: "Tropical Beats",
    coverArt: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop&hue=30",
    trackCount: 9,
    year: 2023,
    releaseDate: "2023-07-15",
    isNew: false
  },
  {
    id: 20,
    title: "Trance Odyssey",
    artist: "Euphoria",
    coverArt: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&h=400&fit=crop&hue=280",
    trackCount: 13,
    year: 2024,
    releaseDate: "2024-11-22",
    isNew: true
  },
  {
    id: 21,
    title: "Urban Beats",
    artist: "City Beats",
    coverArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&hue=90",
    trackCount: 12,
    year: 2024,
    releaseDate: "2024-10-18",
    isNew: true
  },
  {
    id: 22,
    title: "Deep Space",
    artist: "Cosmic Sounds",
    coverArt: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=400&fit=crop&hue=240",
    trackCount: 8,
    year: 2023,
    releaseDate: "2023-05-12",
    isNew: false
  },
  {
    id: 23,
    title: "Vintage Swing",
    artist: "Vintage Future",
    coverArt: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop&hue=60",
    trackCount: 11,
    year: 2024,
    releaseDate: "2024-09-28",
    isNew: true
  },
  {
    id: 24,
    title: "Bass Drop Zone",
    artist: "Heavy Hitters",
    coverArt: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop&hue=320",
    trackCount: 14,
    year: 2024,
    releaseDate: "2024-08-12",
    isNew: false
  },
  {
    id: 25,
    title: "Synthwave Dreams",
    artist: "The Synthwave Collective",
    coverArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop&hue=330",
    trackCount: 13,
    year: 2024,
    releaseDate: "2024-12-18",
    isNew: true
  }
];

export const playlists = [
  {
    id: 1,
    title: "Late Night Vibes",
    curator: "TodoDJS",
    coverArt: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop&sat=-20",
    trackCount: 45,
    isTrending: true
  },
  {
    id: 2,
    title: "Workout Energy",
    curator: "TodoDJS",
    coverArt: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop&sat=20",
    trackCount: 38,
    isTrending: true
  },
  {
    id: 3,
    title: "Deep Focus",
    curator: "TodoDJS",
    coverArt: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&h=400&fit=crop",
    trackCount: 52,
    isTrending: false
  },
  {
    id: 4,
    title: "Summer Hits 2024",
    curator: "TodoDJS",
    coverArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop&brightness=10",
    trackCount: 60,
    isTrending: true
  },
  {
    id: 5,
    title: "Underground Classics",
    curator: "TodoDJS",
    coverArt: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=400&fit=crop",
    trackCount: 42,
    isTrending: false
  },
  {
    id: 6,
    title: "Chill Sundays",
    curator: "TodoDJS",
    coverArt: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop",
    trackCount: 35,
    isTrending: false
  },
  {
    id: 7,
    title: "Party Starters",
    curator: "TodoDJS",
    coverArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&hue=30",
    trackCount: 48,
    isTrending: true
  },
  {
    id: 8,
    title: "Midnight Drive",
    curator: "TodoDJS",
    coverArt: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop&sat=-30",
    trackCount: 40,
    isTrending: false
  },
  {
    id: 9,
    title: "Jazz Lounge",
    curator: "TodoDJS",
    coverArt: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop",
    trackCount: 33,
    isTrending: false
  },
  {
    id: 10,
    title: "Bass Drops",
    curator: "TodoDJS",
    coverArt: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&h=400&fit=crop&hue=270",
    trackCount: 55,
    isTrending: true
  }
];
