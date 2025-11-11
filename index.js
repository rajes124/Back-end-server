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
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("Back-End-server");
    const productsCollection = db.collection("products");

    // Get all products
    app.get("/products", async (req, res) => {
      const result = await productsCollection.find().toArray();
      res.send(result);
    });

    // Get single product by _id
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;

      let query;
      try {
        query = { _id: new ObjectId(id) };
      } catch {
        query = { _id: id };
      }

      const result = await productsCollection.findOne(query);
      if (!result) {
        return res.status(404).send({ message: "Product not found" });
      }
      res.send(result);
    });

    // Latest 6 products (for Home page)
    app.get("/latest-products", async (req, res) => {
      const result = await productsCollection.find().sort({ createdAt: -1 }).limit(6).toArray();
      res.send(result);
    });

    // ------------------------
    // Import product route
    // ------------------------
    app.put("/products/import/:id", async (req, res) => {
      const id = req.params.id;
      const { quantity } = req.body;

      if (!quantity || quantity <= 0) {
        return res.status(400).send({ message: "Invalid quantity" });
      }

      let query;
      try {
        query = { _id: new ObjectId(id) };
      } catch {
        query = { _id: id };
      }

      const product = await productsCollection.findOne(query);
      if (!product) {
        return res.status(404).send({ message: "Product not found" });
      }

      if (quantity > product.availableQuantity) {
        return res.status(400).send({ message: "Import quantity exceeds available stock" });
      }

      // Decrease availableQuantity using $inc
      const updatedProduct = await productsCollection.findOneAndUpdate(
        query,
        { $inc: { availableQuantity: -quantity } },
        { returnDocument: "after" }
      );

      res.send(updatedProduct.value);
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
