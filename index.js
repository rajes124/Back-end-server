const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = "mongodb+srv://Back-End-server:g2EEkN5vBsSFjgM8@website0.ahtmawh.mongodb.net/?appName=website0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("Back-End-server");
    const productsCollection = db.collection("products");
    const userCollection = db.collection("users");

    // Users Route
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const existingUser = await userCollection.findOne({ email: newUser.email });

      if (existingUser) {
        return res.send({ message: "User already exists, no need to insert again." });
      }

      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });

    // Products Routes
    app.get("/products", async (req, res) => {
      const result = await productsCollection.find().toArray();
      res.send(result);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const result = await productsCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productsCollection.insertOne(newProduct);
      res.send(result);
    });

    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updatedProduct = req.body;
      const result = await productsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { name: updatedProduct.name, price: updatedProduct.price } }
      );
      res.send(result);
    });

    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // ✅ Latest 6 Products route (Home page)
    app.get("/latest-products", async (req, res) => {
      try {
        const result = await productsCollection
          .find()
          .sort({ createdAt: -1 }) // নতুন প্রোডাক্ট প্রথম
          .limit(6)
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error fetching latest products", error });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("✅ Successfully connected to MongoDB!");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
}

run().catch(console.dir);

// Root route
app.get("/", (req, res) => {
  res.send("✅ Server is running successfully!");
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
