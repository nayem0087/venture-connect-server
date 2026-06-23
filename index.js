// import dns from "node:dns";
// dns.setServers(["8.8.8.8", "8.8.4.4"]);

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
        const opportunitiesCollection = database.collection("opportunities");

        app.get('/api/startups', async (req, res) => {
            const result = await startupCollection.find({}).toArray();
            res.send(result);
        });

        app.post('/api/startups', async (req, res) => {
            const startup = req.body;
            const newStartup = {
                ...startup,
                createdAt: new Date()
            }
            const result = await startupCollection.insertOne(newStartup);
            res.send(result);
        })


        app.put('/api/startups/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const updatedData = req.body;

                console.log("--- BACKEND HIT ---");
                console.log("Data Received for ID:", id);
                console.log("Body Data:", updatedData);

                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ success: false, message: "Invalid MongoDB ID format" });
                }

                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: {
                        name: updatedData.name,
                        industry: updatedData.industry,
                        funding: updatedData.funding,
                        email: updatedData.email,
                        description: updatedData.description,
                        logo: updatedData.logo || "",
                        status: updatedData.status || "pending"
                    }
                };

                const result = await startupCollection.updateOne(filter, updateDoc);

                console.log("MongoDB Update Result:", result);

                if (result.matchedCount === 0) {
                    return res.status(404).json({ success: false, message: "Startup not found to update" });
                }

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


        app.delete('/api/startups/:id', async (req, res) => {
            try {
                const { id } = req.params;

                console.log("--- BACKEND DELETE HIT ---");
                console.log("Delete Request for ID:", id);

                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ success: false, message: "Invalid MongoDB ID format" });
                }

                const query = { _id: new ObjectId(id) };
                const result = await startupCollection.deleteOne(query);

                console.log("MongoDB Delete Result:", result);

                if (result.deletedCount === 0) {
                    return res.status(404).json({ success: false, message: "Startup not found to delete" });
                }

                res.status(200).json({
                    success: true,
                    message: "Startup deleted successfully"
                });

            } catch (error) {
                console.error("Backend Delete Error:", error);
                res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
            }
        });

        // Opportunities

        app.post('/api/opportunities', async (req, res) => {
            const opportunities = req.body;
            const newOpportunities = {
                ...opportunities,
                createdAt: new Date()
            }
            const result = await opportunitiesCollection.insertOne(newOpportunities);
            res.send(result);
        })

        app.get('/api/jobs', async (req, res) => {
            try {
                const result = await opportunitiesCollection.find().sort({ createdAt: -1 }).toArray();
                res.send({ success: true, data: result });
            } catch (error) {
                res.status(500).send({ success: false, message: error.message });
            }
        });

        app.put('/api/jobs/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const updatedJob = req.body;
                const { _id, ...updateData } = updatedJob;
                const result = await opportunitiesCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updateData }
                );
                res.send({ success: true, result });
            } catch (error) {
                res.status(500).send({ success: false, message: error.message });
            }
        });

        app.delete('/api/jobs/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const result = await opportunitiesCollection.deleteOne({ _id: new ObjectId(id) });
                res.send({ success: true, result });
            } catch (error) {
                res.status(500).send({ success: false, message: error.message });
            }
        });


        //applications
        app.get('/api/jobs-applications', async (req, res) => {
            try {
                const result = await opportunitiesCollection.find().toArray();

                res.send({ success: true, data: result });
            } catch (error) {
                res.status(500).send({ success: false, message: error.message });
            }
        });

        app.put('/api/jobs-applications/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const { status } = req.body; // 'accepted' বা 'rejected'

                const result = await opportunitiesCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { status: status } }
                );

                res.send({ success: true, data: result });
            } catch (error) {
                res.status(500).send({ success: false, message: error.message });
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
