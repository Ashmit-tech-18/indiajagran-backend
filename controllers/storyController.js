const WebStory = require('../models/WebStory');

// 1. GET Recent Stories (For Homepage) - ✅ YE NEW HAI
exports.getRecentWebStories = async (req, res) => {
  try {
    // Sirf Title, Slug aur CoverImage layenge
    const stories = await WebStory.find()
      .select('title slug coverImage createdAt') 
      .sort({ createdAt: -1 }) 
      .limit(10); 

    res.json(stories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching stories' });
  }
};

// 2. GET Single Story (View)
exports.getWebStoryBySlug = async (req, res) => {
  try {
    const story = await WebStory.findOne({ slug: req.params.slug });

    if (!story) {
      return res.status(404).send('Story Not Found');
    }

    const baseUrl = 'https://indiajagran.com';
    const storyUrl = `${baseUrl}/web-stories/${story.slug}`;

    const html = `
    <!doctype html>
    <html amp lang="hi">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
        <title>${story.title} - India Jagran Web Stories</title>
        <link rel="canonical" href="${storyUrl}" />
        <meta name="description" content="${story.pages[0]?.text || story.title}" />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <script async src="https://cdn.ampproject.org/v0.js"></script>
        <script async custom-element="amp-story" src="https://cdn.ampproject.org/v0/amp-story-1.0.js"></script>
        <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
        <style amp-custom>
          amp-story { font-family: 'Roboto', sans-serif; color: #fff; }
          amp-story-page { background-color: #000; }
          h1 { font-size: 1.5em; font-weight: bold; line-height: 1.2; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }
          p { font-size: 1.1em; line-height: 1.5; background: rgba(0,0,0,0.6); padding: 10px; border-radius: 5px; }
          .bottom-text { position: absolute; bottom: 40px; left: 20px; right: 20px; }
        </style>
      </head>
      <body>
        <amp-story standalone
            title="${story.title}"
            publisher="India Jagran"
            publisher-logo-src="${baseUrl}/logo192.png"
            poster-portrait-src="${story.coverImage}">
            
            ${story.pages.map((page, index) => `
              <amp-story-page id="page-${index}">
                <amp-story-grid-layer template="fill">
                  <amp-img src="${page.image}"
                      width="720" height="1280"
                      layout="responsive"
                      alt="${page.heading || story.title}">
                  </amp-img>
                </amp-story-grid-layer>
                <amp-story-grid-layer template="vertical">
                  <div class="bottom-text">
                    ${page.heading ? `<h1>${page.heading}</h1>` : ''}
                    ${page.text ? `<p>${page.text}</p>` : ''}
                  </div>
                </amp-story-grid-layer>
              </amp-story-page>
            `).join('')}

            <amp-story-page id="last-page">
               <amp-story-grid-layer template="vertical" class="center-text">
                  <div style="background: #000; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                    <h1>और खबरें पढ़ें</h1>
                    <p>India Jagran पर ताजा खबरें पढ़ें</p>
                    <a href="${baseUrl}" style="color: white; background: red; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Read More News</a>
                  </div>
               </amp-story-grid-layer>
            </amp-story-page>

        </amp-story>
      </body>
    </html>
    `;
    res.send(html);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// 3. CREATE Story (Admin)
exports.createWebStory = async (req, res) => {
  try {
    const { title, slug, coverImage, pages } = req.body;

    const existingStory = await WebStory.findOne({ slug });
    if (existingStory) {
      return res.status(400).json({ message: 'Slug already exists. Change the URL.' });
    }

    const newStory = new WebStory({ title, slug, coverImage, pages });
    const savedStory = await newStory.save();
    res.status(201).json(savedStory);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error creating story' });
  }
};

// 4. GET ALL Stories (Admin Manage Page ke liye)
exports.getAllWebStories = async (req, res) => {
  try {
    const stories = await WebStory.find().sort({ createdAt: -1 });
    res.json(stories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stories' });
  }
};

// 5. DELETE Story
exports.deleteWebStory = async (req, res) => {
  try {
    await WebStory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting story' });
  }
};

// 6. UPDATE Story
exports.updateWebStory = async (req, res) => {
  try {
    const updatedStory = await WebStory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true } // Return updated doc
    );
    res.json(updatedStory);
  } catch (error) {
    res.status(500).json({ message: 'Error updating story' });
  }
};