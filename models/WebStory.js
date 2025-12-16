const mongoose = require('mongoose');

const WebStorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  coverImage: { type: String, required: true }, // Poster image (Portrait 9:16)
  
  // Har slide ka data
  pages: [
    {
      image: { type: String, required: true }, // Slide image
      text: { type: String }, // Caption/Text
      heading: { type: String } // Slide Headline
    }
  ],
  
  publishedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('WebStory', WebStorySchema);