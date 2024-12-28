
const PORT = process.env.PORT || 4000;

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const jwt =require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const dotEnv = require('dotenv');
const scretKey = process.env.Secret_ecom

dotEnv.config();

app.use(express.json());
app.use(cors()); 

//Database Connetion with MongoDb
mongoose.connect(process.env.MONGO_URI);

//Api creation

app.get("/" , (req , res)=>{
    res.send("Express app is running");
})

//Image storage 
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: function (req, file, cb) {
        return cb(null , `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
});
const upload = multer({storage: storage})
//api for image upload

app.use("/images" , express.static("upload/images"));

app.post("/upload" , upload.single('product'),(req , res)=>{
    res.json({
        success :1,
        message : "Image uploaded successfully",
        image_url : `http://localhost:${port}/images/${req.file.filename}` 
    })
});

//Schema Creating for Products
const Product = mongoose.model("Product" ,{
    id:{
        type : Number ,
        required : true
    },
    name:{
        type : String ,
        required : true
    },
    image:{
        type : String ,
        required : true
    },
    category:{
        type : String ,
        required : true
    },
    new_price:{
        type : Number ,
        required : true
    },
    old_price:{
        type : Number ,
        required : true
    },
    date :{
        type : Date ,
        default : Date.now
    },
    avilable :{
        type : Boolean ,
        default : true
    },

})


app.post("/addproduct" , async (req , res)=> {
    let products = await Product.find({});
    console.log("products" , products)
    let id;
    console.log("id" , id)
    if(products.length > 0){
        console.log("products.length" , products.length);
        console.log("products.length.id" , products.length.id);
        console.log("products[0]" , products[0].id);
        console.log("products" , products[products.length - 1].id );
        id = products[products.length - 1].id + 1;

    }else{
        id = 1;
    }
    console.log("id" , id)
    const product = new Product({
        id : id ,
        name : req.body.name ,
        image : req.body.image ,
        category : req.body.category ,
        new_price : req.body.new_price ,
        old_price : req.body.old_price ,
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.send({
        message : "Product Added Successfully",
        success :true,
        name : req.body.name
    });
});

// creating api for deleting product
app.post("/deleteproduct" , async (req , res)=>{
     await Product.findOneAndDelete({
        id : req.body.id
     });
     console.log("Removed")
     res.send({
        message : "Product Deleted Successfully",
        success : true,
        name : req.body.name
        });
} )

//display the all products
app.get("/allproducts" , async (req , res)=>{
    let products = await Product.find({});
    console.log("products" , products)
    res.send({
        products : products,
        success : true,
    });

});

// Schema creating for User model
const Users = mongoose.model('Users' , {
    name : {
        type : String ,
        required : true ,
    },
    email : {
        type : String ,
        required : true ,
    },
    password : {
        type : String ,
        required : true ,
    },
    cartData:{
        type : Object,

    },
    date:{
        type : Date ,
        default : Date.now ,
    }
});

//creating Endpoint for registering the user
app.post("/register" , async (req , res)=>{

    let checkUser = await Users.findOne({email:req.body.email});
    if(checkUser){
        console.log("User already exists");
        return res.status(400).json({success : false , error: "User already exists this email address"})
    }

    let cart = {};
    for(let i =0 ; i<300+1 ; i++ ){
        cart[i] =0
    }
    let user = new Users({
        name : req.body.name ,
        email : req.body.email ,
        password : req.body.password ,
        cartData : cart ,
    })

    await user.save();

    const data = {
        user:{
            id:user.id
        }
    }

    const token = jwt.sign(data , scretKey);
    res.json({success : true , token })
});


//creating endpoint for user  login
app.post("/login" , async (req , res)=>{
    let user = await Users.findOne({email:req.body.email });
    if(user){
        const paswdCompare = req.body.password === user.password;
        if(paswdCompare){
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data , scretKey);
            res.json({success : true , token })
        }else{
            console.log("Password is incorrect");
            return res.status(400).json({success : false , error: "Password is incorrect"})
        }
    }else{
        console.log("User does not exist");
        return res.status(400).json({success : false , error: "User does not exist"})
    }
});

//creating endpoint of new collection 
app.get("/newcollection" , async (req , res)=>{
    let products = await Product.find({});
    let newcollection =products.slice(1).slice(-8);
    console.log("New Collection")
    res.json({success : true , newcollection })
});

//creating endpoint for popular in women
app.get("/popular-women" , async (req , res)=>{
    let products = await Product.find({category :"women"});
    let popular_women = products.slice(0 ,4);
    console.log("Popular Women")
    res.json({success : true , popular_women })

});
//creating middleware for fetch user
const fetchUser = async (req , res , next)=>{
    const token = req.header('auth-token')
    if(!token){
        res.status(401).send({success : false , error: "Access denied. please authenticate using valid token "});
        console.log( "Error on token fetch")


    }else{
        try {
            const data = jwt.verify(token , scretKey);
            req.user = data.user;
            console.log(data , "jwt data")
            next();
        } catch (error) {
            console.log(error , "Error")
            res.status(401).json({success : false , error: "Invalid token "})
        }
    }

}

//creating endpoint for add to cart 
app.post("/add-to-cart" ,fetchUser  , async (req , res)=>{
    console.log(req.body , req.user , "add-to-cart");
    let usersData = await Users.findOne({_id:req.user.id});
    console.log(usersData ,"usersData")
    usersData.cartData[req.body.itemID] += 1; 
    
    await Users.findOneAndUpdate({_id:req.user.id} ,{cartData:usersData.cartData});
    res.json({success : true , message : "Item added to cart " })
});
//creating endpoint for remove from cart
app.post("/remove-from-cart" ,fetchUser  , async (req , res)=>{
    console.log(req.body , req.user , "remove-from-cart");
    let usersData = await Users.findOne({_id:req.user.id});
    if(usersData.cartData[req.body.itemID] > 0)
        usersData.cartData[req.body.itemID] -= 1;
    await Users.findOneAndUpdate({_id:req.user.id} ,{cartData:usersData.cartData });
    res.json({success : true , message : "Item removed from cart " , })
});
//creating endpoint for get cart data
app.post("/get-cart-data" ,fetchUser  , async (req , res)=>{
    console.log(req.user , "get-cart-data");
    let usersData = await Users.findOne({_id:req.user.id});
    res.json(usersData.cartData)
})

app.listen(port , (error)=>{
    if(!error){
        console.log(`Server is running on port ${port}`);
    }else{
        console.log(`Error in server ${error}`);
    }
})