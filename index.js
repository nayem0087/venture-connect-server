const express = require('express');
const cors = require('cors')
const app = express();
const port = 5000;
require('dotenv').config();

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.get('/', (req, res) => {
    res.send('Hello World!');
});



const uri = process.env.MONGO_DB_URL;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const database = client.db("venture_connect_db");
        const startupCollection = database.collection("startups");

        app.get('/api/startups', async (req, res) => {
            const result = await startupCollection.find({}).toArray();
            res.send(result);
        });

        app.post('/api/startups', async (req, res) => {
            const startup = req.body;
            const result = await startupCollection.insertOne(startup);
            res.send(result);
        })

       // ✅ Native MongoDB Driver অনুযায়ী নিখুঁত আপডেট রাউট
        app.put('/api/startups/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const updatedData = req.body;
                
                console.log("--- BACKEND HIT ---");
                console.log("Data Received for ID:", id);
                console.log("Body Data:", updatedData);

                // ১. আইডি ভ্যালিড কি না চেক করা (Native MongoDB নিয়ম)
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ success: false, message: "Invalid MongoDB ID format" });
                }

                // ২. মঙ্গোডিবি ড্রাইভার দিয়ে ফিল্টার ও আপডেট কুয়েরি তৈরি করা
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: {
                        name: updatedData.name,
                        industry: updatedData.industry,
                        funding: updatedData.funding,
                        email: updatedData.email,
                        description: updatedData.description,
                        status: updatedData.status || "pending" // স্ট্যাটাস থাকলে যাবে, না থাকলে ডিফল্ট pending
                    }
                };

                // ৩. ডাটাবেজে আপডেট অপারেশন চালানো
                const result = await startupCollection.updateOne(filter, updateDoc);

                console.log("MongoDB Update Result:", result);

                if (result.matchedCount === 0) {
                    return res.status(404).json({ success: false, message: "Startup not found to update" });
                }

                // ৪. নেক্সট জেএস ফ্রন্টএন্ডে সাকসেস রেসপন্স পাঠানো
                res.status(200).json({ 
                    success: true, 
                    message: "Startup updated successfully",
                    data: result 
                });

            } catch (error) {
                console.error("Backend Error Details:", error);
                res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
            }
        });
      

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
