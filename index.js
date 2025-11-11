const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// ----------------------------
// MongoDB Connection
// ----------------------------
const uri = "mongodb+srv://Back-End-server:g2EEkN5vBsSFjgM8@website0.ahtmawh.mongodb.net/?appName=website0";

// Create a MongoClient with options
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});




// Async function to connect MongoDB
async function run() {
  try {
    await client.connect();



const db = client.db('Back-End-server');
const productsCollection = db.collection('products');


app.get ('/products', async(req,res)=>{
  const cursor = productsCollection.find();
  const result = await cursor.toArray();
  res.send(result)
})


app.get ('/products/:id', async(req,res)=>{
  const id =  req.params.id;
  const query = {_id: new ObjectId(id)}
  const result = await productsCollection.findOne(query);
  res.send(result);
})


app.post('/products', async(req,res)=>{
  const newProduct = req.body;
  const result = await productsCollection.insertOne(newProduct);
  res.send(result);
}) 


app.patch ('/products/:id', async(req,res)=>{
  const id =  req.params.id;
  const updatedProduct = req.body ;
  const query = {_id: new ObjectId (id)}
  const update = {
    $set:{ 
     name: updatedProduct.name,
     price: updatedProduct.price
    } 
  }

  const result = await productsCollection.updateOne(query,update)
  res.send(result)

})

app.delete('/products/:id', async(req,res)=>{
  const id =  req.params.id;
  const query = {_id:new ObjectId(id)}
  const result = await productsCollection.deleteOne(query);
  res.send(result);
})


    await client.db("admin").command({ ping: 1 });
    console.log("✅ Successfully connected to MongoDB!");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
}
run().catch(console.dir);

// ----------------------------
// Root route
// ----------------------------
app.get("/", (req, res) => {
  res.send("✅ Server is running successfully!");
});

// ----------------------------
// Start server
// ----------------------------
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
