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

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();

        const database = client.db("venture_connect_db");
        const startupCollection = database.collection("startups");
        const opportunitiesCollection = database.collection("opportunities");
        const usersCollection = database.collection("user");
        const applicationCollection = database.collection("application");
        const planCollection = database.collection("plan");
        const paymentsCollection = database.collection("payments");
        const transactionsCollection = database.collection("transactions");

        // ─── User routes 

        app.post('/api/user', async (req, res) => {
            try {
                const user = req.body;
                if (!user?.email) return res.status(400).json({ success: false, message: "Email is required." });
                const existingUser = await usersCollection.findOne({ email: user.email });
                if (existingUser) return res.status(409).json({ success: false, message: "A user with this email already exists." });
                const result = await usersCollection.insertOne({ ...user, createdAt: new Date() });
                res.status(201).json({ success: true, insertedId: result.insertedId });
            } catch (error) {
                if (error.code === 11000) return res.status(409).json({ success: false, message: "A user with this email already exists." });
                res.status(500).json({ success: false, message: error.message });
            }
        });

        app.get('/api/users', async (req, res) => {
            try {
                const result = await usersCollection.find().skip(1).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        });

        app.get('/api/users/:email', async (req, res) => {
            try {
                const { email } = req.params;
                const user = await usersCollection.findOne({ email });
                if (!user) return res.status(404).json({ success: false, message: "User not found" });
                res.send(user);
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        app.patch('/api/users/upgrade', async (req, res) => {
            try {
                const { email } = req.body;
                if (!email) return res.status(400).json({ success: false, message: "Email is required" });
                const existingUser = await usersCollection.findOne({ email });
                if (!existingUser) return res.status(404).json({ success: false, message: "User not found" });
                const premiumPlan = existingUser.role === 'founder' ? 'founder_premium' : 'collaborator_premium';
                await usersCollection.updateOne({ email }, { $set: { isPremium: true, plan: premiumPlan, upgradedAt: new Date() } });
                res.status(200).json({ success: true, message: "User upgraded to premium", plan: premiumPlan });
            } catch (error) {
                res.status(500).json({ success: false, message: "Internal Server Error" });
            }
        });

        app.patch('/api/users/:id', async (req, res) => {
            const { id } = req.params;
            const { status } = req.body;
            const result = await usersCollection.updateOne({ _id: new ObjectId(id) }, { $set: { status } });
            res.send(result);
        });

        app.put('/api/users/:email', async (req, res) => {
            try {
                const { email } = req.params;
                const updatedData = req.body;
                const result = await usersCollection.updateOne(
                    { email },
                    { $set: { name: updatedData.name, image: updatedData.image, skills: updatedData.skills, bio: updatedData.bio, updatedAt: new Date() } }
                );
                res.send({ success: true, result });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        // ─── Startup routes 

        app.post('/api/startups', async (req, res) => {
            const startup = req.body;
            const result = await startupCollection.insertOne({ ...startup, createdAt: new Date() });
            res.send(result);
        });

        app.get('/api/startups', async (req, res) => {
            try {
                const { search, industry } = req.query;
                let query = {};
                if (search && search.trim() !== "") {
                    query.$or = [
                        { name: { $regex: search, $options: 'i' } },
                        { description: { $regex: search, $options: 'i' } }
                    ];
                }
                if (industry && industry !== "All" && industry.trim() !== "") {
                    query.industry = industry;
                }
                const startups = await startupCollection.find(query).sort({ createdAt: -1 }).toArray();
                res.send(startups);
            } catch (error) {
                res.status(500).send({ message: "Error fetching data" });
            }
        });

        app.put('/api/startups/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const updatedData = req.body;
                if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid MongoDB ID format" });
                const result = await startupCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { name: updatedData.name, industry: updatedData.industry, funding: updatedData.funding, email: updatedData.email, description: updatedData.description, logo: updatedData.logo || "", status: updatedData.status || "pending" } }
                );
                if (result.matchedCount === 0) return res.status(404).json({ success: false, message: "Startup not found to update" });
                res.status(200).json({ success: true, message: "Startup updated successfully", data: result });
            } catch (error) {
                res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
            }
        });

        app.delete('/api/startups/:id', async (req, res) => {
            try {
                const { id } = req.params;
                if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid MongoDB ID format" });
                const result = await startupCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount === 0) return res.status(404).json({ success: false, message: "Startup not found to delete" });
                res.status(200).json({ success: true, message: "Startup deleted successfully" });
            } catch (error) {
                res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
            }
        });

        app.patch('/api/startups/:id', async (req, res) => {
            const { id } = req.params;
            const { status } = req.body;
            const result = await startupCollection.updateOne({ _id: new ObjectId(id) }, { $set: { status } });
            res.send(result);
        });

        // ─── Opportunities routes 

        app.get('/api/opportunities', async (req, res) => {
            try {
                const { search, workType, page = 1, limit = 9 } = req.query;
                const skip = (Number(page) - 1) * Number(limit);

                let query = {};
                if (search) query.title = { $regex: search, $options: 'i' };
                if (workType && workType !== "All") query.workType = workType;

                const total = await opportunitiesCollection.countDocuments(query);
                const data = await opportunitiesCollection
                    .find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(Number(limit))
                    .toArray();

                res.json({
                    success: true,
                    data,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        totalPages: Math.ceil(total / Number(limit))
                    }
                });
            } catch (error) {
                res.status(500).json({ success: false, message: "Error fetching data" });
            }
        });

        app.get('/api/opportunities/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await opportunitiesCollection.findOne({ _id: new ObjectId(id) });
                if (!result) return res.status(404).json({ message: "Not found" });
                res.json(result);
            } catch (error) {
                res.status(500).json({ message: "Server Error" });
            }
        });

        app.post('/api/opportunities', async (req, res) => {
            const opportunities = req.body;
            const result = await opportunitiesCollection.insertOne({ ...opportunities, createdAt: new Date() });
            res.send(result);
        });

        // /api/jobs — founder dashboard manage opportunities (founderEmail filter)
        app.get('/api/jobs', async (req, res) => {
            const { page = 1, limit = 10 } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            try {
                const total = await opportunitiesCollection.countDocuments();
                const result = await opportunitiesCollection
                    .find()
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(Number(limit))
                    .toArray();
                res.send({ success: true, data: result, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } });
            } catch (error) {
                res.status(500).send({ success: false, message: error.message });
            }
        });

        app.post('/api/jobs', async (req, res) => {
            const opportunities = req.body;
            const result = await opportunitiesCollection.insertOne({ ...opportunities, createdAt: new Date() });
            res.send(result);
        });

        app.put('/api/jobs/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const { _id, ...updateData } = req.body;
                const result = await opportunitiesCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
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

        // ─── Application routes 

        app.post('/api/applications', async (req, res) => {
            try {
                const application = req.body;
                const result = await applicationCollection.insertOne({ ...application, createdAt: new Date() });
                res.status(201).send(result);
            } catch (error) {
                res.status(500).send({ error: "Failed to save application", details: error.message });
            }
        });

        app.get('/api/applications', async (req, res) => {
            try {
                const query = {};
                if (req.query.applicantEmail) query.applicantEmail = req.query.applicantEmail;
                if (req.query.applicantId) query.applicantId = req.query.applicantId;
                if (req.query.jobId) query.jobId = req.query.jobId;
                const result = await applicationCollection.find(query).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ error: "Failed to fetch applications" });
            }
        });

        app.put('/api/applications/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const { status } = req.body;
                if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid application ID" });
                const result = await applicationCollection.updateOne({ _id: new ObjectId(id) }, { $set: { status } });
                if (result.matchedCount === 0) return res.status(404).json({ success: false, message: "Application not found" });
                res.status(200).json({ success: true, data: result });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        // ─── Plan routes 

        app.get('/api/plan', async (req, res) => {
            const query = {};
            if (req.query.plan_id) query.id = req.query.plan_id;
            const plan = await planCollection.findOne(query);
            res.send(plan);
        });

        // ─── Payment routes 

        app.post('/api/payments', async (req, res) => {
            const result = await paymentsCollection.insertOne(req.body);
            res.send(result);
        });

        app.get('/api/payments', async (req, res) => {
            const payments = await paymentsCollection.find({}).toArray();
            res.send(payments);
        });

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});












// // import dns from "node:dns";
// // dns.setServers(["8.8.8.8", "8.8.4.4"]);

// const express = require('express');
// const cors = require('cors')
// const app = express();
// const port = 5000;
// require('dotenv').config();

// app.use(cors());
// app.use(express.json());

// const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// app.get('/', (req, res) => {
//     res.send('Hello World!');
// });


// const uri = process.env.MONGO_DB_URL;

// // Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//     serverApi: {
//         version: ServerApiVersion.v1,
//         strict: true,
//         deprecationErrors: true,
//     }
// });

// async function run() {
//     try {
//         // Connect the client to the server	(optional starting in v4.7)
//         await client.connect();


//         const database = client.db("venture_connect_db");
//         const startupCollection = database.collection("startups");
//         const opportunitiesCollection = database.collection("opportunities");
//         const usersCollection = database.collection("user");
//         const applicationCollection = database.collection("application");
//         const planCollection = database.collection("plan");
//         const paymentsCollection = database.collection("payments");
//         const transactionsCollection = database.collection("transactions");


//         // user related api
//         app.post('/api/user', async (req, res) => {
//             try {
//                 const user = req.body;

//                 if (!user?.email) {
//                     return res.status(400).json({ success: false, message: "Email is required." });
//                 }

//                 const existingUser = await usersCollection.findOne({ email: user.email });
//                 if (existingUser) {
//                     return res.status(409).json({
//                         success: false,
//                         message: "A user with this email already exists.",
//                     });
//                 }
//                 const newUser = {
//                     ...user,
//                     createdAt: new Date()
//                 };
//                 const result = await usersCollection.insertOne(newUser);
//                 res.status(201).json({ success: true, insertedId: result.insertedId });
//             } catch (error) {
//                 if (error.code === 11000) {
//                     return res.status(409).json({
//                         success: false,
//                         message: "A user with this email already exists.",
//                     });
//                 }
//                 res.status(500).json({ success: false, message: error.message });
//             }
//         });

//         app.get('/api/users', async (req, res) => {
//             try {
//                 const result = await usersCollection.find().skip(1).toArray();
//                 console.log("Found users:", result);
//                 res.send(result);
//             } catch (error) {
//                 res.status(500).json({ message: error.message });
//             }
//         });

//         app.get('/api/users/:email', async (req, res) => {
//             try {
//                 const { email } = req.params;
//                 const user = await usersCollection.findOne({ email });

//                 if (!user) {
//                     return res.status(404).json({ success: false, message: "User not found" });
//                 }

//                 res.send(user);
//             } catch (error) {
//                 res.status(500).json({ success: false, message: error.message });
//             }
//         });

//         app.patch('/api/users/upgrade', async (req, res) => {
//             try {
//                 const { email } = req.body;

//                 if (!email) {
//                     return res.status(400).json({ success: false, message: "Email is required" });
//                 }

//                 const existingUser = await usersCollection.findOne({ email });
//                 if (!existingUser) {
//                     return res.status(404).json({ success: false, message: "User not found" });
//                 }

//                 const premiumPlan = existingUser.role === 'founder'
//                     ? 'founder_premium'
//                     : 'collaborator_premium';

//                 const result = await usersCollection.updateOne(
//                     { email },
//                     { $set: { isPremium: true, plan: premiumPlan, upgradedAt: new Date() } }
//                 );

//                 res.status(200).json({
//                     success: true,
//                     message: "User upgraded to premium",
//                     plan: premiumPlan,
//                 });

//             } catch (error) {
//                 console.error("Upgrade Error:", error);
//                 res.status(500).json({ success: false, message: "Internal Server Error" });
//             }
//         });

//         // Toggle Block Status (Block/Unblock)
//         app.patch('/api/users/:id', async (req, res) => {
//             const { id } = req.params;
//             const { status } = req.body; // 'Active' or 'Blocked'
//             const result = await usersCollection.updateOne(
//                 { _id: new ObjectId(id) },
//                 { $set: { status: status } }
//             );
//             res.send(result);
//         });

//         app.put('/api/users/:email', async (req, res) => {
//             try {
//                 const { email } = req.params;
//                 const updatedData = req.body;
//                 const filter = { email: email };
//                 const updateDoc = {
//                     $set: {
//                         name: updatedData.name,
//                         image: updatedData.image,
//                         skills: updatedData.skills,
//                         bio: updatedData.bio,
//                         updatedAt: new Date()
//                     }
//                 };
//                 const result = await usersCollection.updateOne(filter, updateDoc);
//                 res.send({ success: true, result });
//             } catch (error) {
//                 res.status(500).json({ success: false, message: error.message });
//             }
//         });


//         // startups related api 
//         app.post('/api/startups', async (req, res) => {
//             const startup = req.body;
//             const newStartup = {
//                 ...startup,
//                 createdAt: new Date()
//             }
//             const result = await startupCollection.insertOne(newStartup);
//             res.send(result);
//         })

//         app.put('/api/startups/:id', async (req, res) => {
//             try {
//                 const { id } = req.params;
//                 const updatedData = req.body;

//                 console.log("--- BACKEND HIT ---");
//                 console.log("Data Received for ID:", id);
//                 console.log("Body Data:", updatedData);

//                 if (!ObjectId.isValid(id)) {
//                     return res.status(400).json({ success: false, message: "Invalid MongoDB ID format" });
//                 }

//                 const filter = { _id: new ObjectId(id) };
//                 const updateDoc = {
//                     $set: {
//                         name: updatedData.name,
//                         industry: updatedData.industry,
//                         funding: updatedData.funding,
//                         email: updatedData.email,
//                         description: updatedData.description,
//                         logo: updatedData.logo || "",
//                         status: updatedData.status || "pending"
//                     }
//                 };

//                 const result = await startupCollection.updateOne(filter, updateDoc);

//                 console.log("MongoDB Update Result:", result);

//                 if (result.matchedCount === 0) {
//                     return res.status(404).json({ success: false, message: "Startup not found to update" });
//                 }

//                 res.status(200).json({
//                     success: true,
//                     message: "Startup updated successfully",
//                     data: result
//                 });

//             } catch (error) {
//                 console.error("Backend Error Details:", error);
//                 res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
//             }
//         });

//         app.delete('/api/startups/:id', async (req, res) => {
//             try {
//                 const { id } = req.params;

//                 console.log("--- BACKEND DELETE HIT ---");
//                 console.log("Delete Request for ID:", id);

//                 if (!ObjectId.isValid(id)) {
//                     return res.status(400).json({ success: false, message: "Invalid MongoDB ID format" });
//                 }

//                 const query = { _id: new ObjectId(id) };
//                 const result = await startupCollection.deleteOne(query);

//                 console.log("MongoDB Delete Result:", result);

//                 if (result.deletedCount === 0) {
//                     return res.status(404).json({ success: false, message: "Startup not found to delete" });
//                 }

//                 res.status(200).json({
//                     success: true,
//                     message: "Startup deleted successfully"
//                 });

//             } catch (error) {
//                 console.error("Backend Delete Error:", error);
//                 res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
//             }
//         });

//         app.patch('/api/startups/:id', async (req, res) => {
//             const { id } = req.params;
//             const { status } = req.body;
//             const filter = { _id: new ObjectId(id) };
//             const updateDoc = { $set: { status: status } };
//             const result = await startupCollection.updateOne(filter, updateDoc);
//             res.send(result);
//         });

//         // startups search
//         app.get('/api/startups', async (req, res) => {
//             try {
//                 const { search, industry } = req.query;
//                 let query = {};

//                 if (search && search.trim() !== "") {
//                     query.$or = [
//                         { name: { $regex: search, $options: 'i' } },
//                         { description: { $regex: search, $options: 'i' } }
//                     ];
//                 }

//                 if (industry && industry !== "All" && industry.trim() !== "") {
//                     query.industry = industry;
//                 }

//                 console.log("Final MongoDB Query:", query);

//                 const startups = await startupCollection.find(query).sort({ createdAt: -1 }).toArray();
//                 res.send(startups);
//             } catch (error) {
//                 console.error("Backend Error:", error);
//                 res.status(500).send({ message: "Error fetching data" });
//             }
//         });

//         // opportunities search
//         app.get('/api/opportunities', async (req, res) => {
//             try {
//                 const { search, workType } = req.query;
//                 let query = {};

//                 if (search) {
//                     query.title = { $regex: search, $options: 'i' };
//                 }

//                 if (workType && workType !== "All") {
//                     query.workType = workType;
//                 }

//                 const data = await opportunitiesCollection.find(query).sort({ createdAt: -1 }).toArray();
//                 res.json({ success: true, data });
//             } catch (error) {
//                 res.status(500).json({ success: false, message: "Error fetching data" });
//             }
//         });

//         // Opportunities
//         app.post('/api/jobs', async (req, res) => {
//             const opportunities = req.body;
//             const newOpportunities = {
//                 ...opportunities,
//                 createdAt: new Date()
//             }
//             const result = await opportunitiesCollection.insertOne(newOpportunities);
//             res.send(result);
//         })

//         app.get('/api/opportunities', async (req, res) => {
//             try {
//                 const { search, workType, page = 1, limit = 9 } = req.query;
//                 const skip = (Number(page) - 1) * Number(limit);

//                 let query = {};

//                 if (search) {
//                     query.title = { $regex: search, $options: 'i' };
//                 }

//                 if (workType && workType !== "All") {
//                     query.workType = workType;
//                 }

//                 const total = await opportunitiesCollection.countDocuments(query);
//                 const data = await opportunitiesCollection
//                     .find(query)
//                     .sort({ createdAt: -1 })
//                     .skip(skip)
//                     .limit(Number(limit))
//                     .toArray();

//                 res.json({
//                     success: true,
//                     data,
//                     pagination: {
//                         total,
//                         page: Number(page),
//                         limit: Number(limit),
//                         totalPages: Math.ceil(total / Number(limit))
//                     }
//                 });
//             } catch (error) {
//                 res.status(500).json({ success: false, message: "Error fetching data" });
//             }
//         });

//         app.get('/api/opportunities/:id', async (req, res) => {
//             try {
//                 const { id } = req.params;
//                 const query = { _id: new ObjectId(id) };
//                 const result = await opportunitiesCollection.findOne(query);

//                 if (!result) {
//                     return res.status(404).json({ message: "Not found" });
//                 }
//                 res.json(result);
//             } catch (error) {
//                 res.status(500).json({ message: "Server Error" });
//             }
//         });

//         app.put('/api/jobs/:id', async (req, res) => {
//             try {
//                 const id = req.params.id;
//                 const updatedJob = req.body;
//                 const { _id, ...updateData } = updatedJob;
//                 const result = await opportunitiesCollection.updateOne(
//                     { _id: new ObjectId(id) },
//                     { $set: updateData }
//                 );
//                 res.send({ success: true, result });
//             } catch (error) {
//                 res.status(500).send({ success: false, message: error.message });
//             }
//         });

//         app.delete('/api/jobs/:id', async (req, res) => {
//             try {
//                 const id = req.params.id;
//                 const result = await opportunitiesCollection.deleteOne({ _id: new ObjectId(id) });
//                 res.send({ success: true, result });
//             } catch (error) {
//                 res.status(500).send({ success: false, message: error.message });
//             }
//         });


//         //applications
//         app.get('/api/jobs-applications', async (req, res) => {
//             try {
//                 const result = await opportunitiesCollection.find().toArray();

//                 res.send({ success: true, data: result });
//             } catch (error) {
//                 res.status(500).send({ success: false, message: error.message });
//             }
//         });

//         app.put('/api/applications/:id', async (req, res) => {
//             try {
//                 const { id } = req.params;
//                 const { status } = req.body;

//                 if (!ObjectId.isValid(id)) {
//                     return res.status(400).json({ success: false, message: "Invalid application ID" });
//                 }

//                 const result = await applicationCollection.updateOne(
//                     { _id: new ObjectId(id) },
//                     { $set: { status: status } }
//                 );

//                 if (result.matchedCount === 0) {
//                     return res.status(404).json({ success: false, message: "Application not found" });
//                 }

//                 res.status(200).json({ success: true, data: result });
//             } catch (error) {
//                 res.status(500).json({ success: false, message: error.message });
//             }
//         });

//         // app.put('/api/jobs-applications/:id', async (req, res) => {
//         //     try {
//         //         const id = req.params.id;
//         //         const { status } = req.body; // 'accepted' বা 'rejected'

//         //         const result = await opportunitiesCollection.updateOne(
//         //             { _id: new ObjectId(id) },
//         //             { $set: { status: status } }
//         //         );

//         //         res.send({ success: true, data: result });
//         //     } catch (error) {
//         //         res.status(500).send({ success: false, message: error.message });
//         //     }
//         // });

//         // application related api
//         app.post('/api/applications', async (req, res) => {
//             try {
//                 const application = req.body;

//                 const newApplication = {
//                     ...application,
//                     createdAt: new Date()
//                 };
//                 const result = await applicationCollection.insertOne(newApplication);

//                 console.log("Application saved successfully:", result);
//                 res.status(201).send(result);

//             } catch (error) {
//                 console.error("MongoDB Insertion Error:", error.message);
//                 res.status(500).send({ error: "Failed to save application", details: error.message });
//             }
//         });

//         app.get('/api/applications', async (req, res) => {
//             try {
//                 const query = {};

//                 if (req.query.applicantEmail) {
//                     query.applicantEmail = req.query.applicantEmail;
//                 }

//                 if (req.query.applicantId) {
//                     query.applicantId = req.query.applicantId;
//                 }
//                 if (req.query.jobId) {
//                     query.jobId = req.query.jobId;
//                 }

//                 const cursor = applicationCollection.find(query);
//                 const result = await cursor.toArray();
//                 res.send(result);
//             } catch (error) {
//                 console.error("Error fetching applications:", error);
//                 res.status(500).send({ error: "Failed to fetch applications" });
//             }
//         });

//         // plan 
//         app.get('/api/plan', async (req, res) => {
//             const query = {}
//             if (req.query.plan_id) {
//                 query.id = req.query.plan_id
//             }
//             const plan = await planCollection.findOne(query);
//             res.send(plan)
//         })

//         // payment related api
//         app.post('/api/payments', async (req, res) => {
//             const paymentData = req.body;
//             const result = await paymentsCollection.insertOne(paymentData);
//             res.send(result);
//         });

//         app.get('/api/payments', async (req, res) => {
//             const payments = await paymentsCollection.find({}).toArray();
//             res.send(payments);
//         });


//         // Send a ping to confirm a successful connection
//         await client.db("admin").command({ ping: 1 });
//         console.log("Pinged your deployment. You successfully connected to MongoDB!");
//     } finally {
//         // Ensures that the client will close when you finish/error
//         // await client.close();
//     }
// }
// run().catch(console.dir);


// app.listen(port, () => {
//     console.log(`Example app listening on port ${port}`);
// });
