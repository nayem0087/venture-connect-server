const { ObjectId } = require('mongodb');

function registerNotificationRoutes(app, { notificationsCollection }) {

    // GET /api/notifications?email=someone@example.com
    app.get('/api/notifications', async (req, res) => {
        try {
            const { email } = req.query;
            if (!email) {
                return res.status(400).json({ success: false, message: "email query param is required" });
            }

            const notifications = await notificationsCollection
                .find({ userEmail: email })
                .sort({ createdAt: -1 })
                .limit(30)
                .toArray();

            res.status(200).json({ success: true, notifications });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // GET /api/notifications/unread-count?email=someone@example.com
    app.get('/api/notifications/unread-count', async (req, res) => {
        try {
            const { email } = req.query;
            if (!email) {
                return res.status(400).json({ success: false, message: "email query param is required" });
            }

            const count = await notificationsCollection.countDocuments({ userEmail: email, read: false });
            res.status(200).json({ success: true, count });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // PATCH /api/notifications/:id/read
    app.patch('/api/notifications/:id/read', async (req, res) => {
        try {
            const { id } = req.params;
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({ success: false, message: "Invalid notification ID" });
            }

            await notificationsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { read: true } }
            );

            res.status(200).json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // PATCH /api/notifications/mark-all-read
    // body: { email }
    app.patch('/api/notifications/mark-all-read', async (req, res) => {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ success: false, message: "email is required" });
            }

            await notificationsCollection.updateMany(
                { userEmail: email, read: false },
                { $set: { read: true } }
            );

            res.status(200).json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });
}

module.exports = { registerNotificationRoutes };