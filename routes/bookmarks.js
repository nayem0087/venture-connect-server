const { ObjectId } = require('mongodb');

function registerBookmarkRoutes(app, { bookmarksCollection, startupCollection, opportunitiesCollection }) {

    // POST /api/bookmarks
    // body: { userEmail, itemId, itemType: 'startup' | 'opportunity' }
    app.post('/api/bookmarks', async (req, res) => {
        try {
            const { userEmail, itemId, itemType } = req.body;

            if (!userEmail || !itemId || !itemType) {
                return res.status(400).json({ success: false, message: "userEmail, itemId, and itemType are required" });
            }
            if (!['startup', 'opportunity'].includes(itemType)) {
                return res.status(400).json({ success: false, message: "itemType must be 'startup' or 'opportunity'" });
            }

            // Upsert — clicking bookmark twice never creates duplicates.
            await bookmarksCollection.updateOne(
                { userEmail, itemId, itemType },
                { $setOnInsert: { userEmail, itemId, itemType, createdAt: new Date() } },
                { upsert: true }
            );

            res.status(200).json({ success: true, bookmarked: true });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // DELETE /api/bookmarks
    // body: { userEmail, itemId, itemType }
    app.delete('/api/bookmarks', async (req, res) => {
        try {
            const { userEmail, itemId, itemType } = req.body;

            if (!userEmail || !itemId || !itemType) {
                return res.status(400).json({ success: false, message: "userEmail, itemId, and itemType are required" });
            }

            await bookmarksCollection.deleteOne({ userEmail, itemId, itemType });

            res.status(200).json({ success: true, bookmarked: false });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // GET /api/bookmarks/ids?email=someone@example.com
    // Lightweight — just the ids, for showing filled/outline heart icons on listing pages.
    app.get('/api/bookmarks/ids', async (req, res) => {
        try {
            const { email } = req.query;
            if (!email) {
                return res.status(400).json({ success: false, message: "email query param is required" });
            }

            const bookmarks = await bookmarksCollection
                .find({ userEmail: email }, { projection: { itemId: 1, itemType: 1, _id: 0 } })
                .toArray();

            res.status(200).json({ success: true, bookmarks });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // GET /api/bookmarks?email=someone@example.com
    // Full "Saved Items" page — fetches the actual startup/opportunity documents.
    app.get('/api/bookmarks', async (req, res) => {
        try {
            const { email } = req.query;
            if (!email) {
                return res.status(400).json({ success: false, message: "email query param is required" });
            }

            const bookmarks = await bookmarksCollection
                .find({ userEmail: email })
                .sort({ createdAt: -1 })
                .toArray();

            const items = await Promise.all(
                bookmarks.map(async (b) => {
                    if (!ObjectId.isValid(b.itemId)) return null;

                    const collection = b.itemType === 'startup' ? startupCollection : opportunitiesCollection;
                    const doc = await collection.findOne({ _id: new ObjectId(b.itemId) });
                    if (!doc) return null;

                    return { ...doc, itemType: b.itemType, savedAt: b.createdAt };
                })
            );

            res.status(200).json({ success: true, items: items.filter(Boolean) });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });
}

module.exports = { registerBookmarkRoutes };