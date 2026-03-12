const express = require("express")
const bodyParser = require("body-parser")
const session = require("express-session")
const bcrypt = require("bcryptjs")
const axios = require("axios")
const admin = require("firebase-admin")
const path = require("path")
const ejs = require("ejs");
const app = express()

/* ---------- Firebase Setup ---------- */

const serviceAccount = require("./firebase-key.json")

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://adviser-platform-default-rtdb.firebaseio.com/"
})

const db = admin.database()

/* ---------- Express Setup ---------- */

app.set("view engine","ejs")
app.set("views", path.join(__dirname,"views"))

app.use(express.static(path.join(__dirname,"public")))

app.use(bodyParser.urlencoded({extended:true}))
app.use(bodyParser.json())

app.use(session({
    secret:"brand_diffusion_secret",
    resave:false,
    saveUninitialized:false
}))

/* ---------- TEST ROUTE ---------- */

app.get("/test",(req,res)=>{
    res.send("Server working")
})

/* ---------- HOME ---------- */

app.get("/",(req,res)=>{
    res.redirect("/login")
})

/* ---------- REGISTER PAGE ---------- */

app.get("/register",(req,res)=>{
    res.render("register")
})

/* ---------- REGISTER ---------- */

app.post("/register",async(req,res)=>{

    try{

        const {email,password,company} = req.body

        const snapshot = await db.ref("users").once("value")

        const users = snapshot.val() || {}

        for(let id in users){
            if(users[id].email === email){
                return res.send("User already exists")
            }
        }

        const hash = await bcrypt.hash(password,10)

        const newUser = db.ref("users").push()

        await newUser.set({
            email,
            password:hash,
            company,
            role:"user"
        })

        res.redirect("/login")

    }catch(err){

        console.log(err)
        res.send("Registration error")

    }

})

/* ---------- LOGIN PAGE ---------- */

app.get("/login",(req,res)=>{
    res.render("login")
})

/* ---------- LOGIN ---------- */

app.post("/login",async(req,res)=>{

    try{

        const {email,password} = req.body

        const snapshot = await db.ref("users").once("value")

        const users = snapshot.val() || {}

        let user = null

        for(let id in users){

            if(users[id].email === email){

                user = users[id]
                break

            }

        }

        if(!user){

            return res.send("User not found")

        }

        const valid = await bcrypt.compare(password,user.password)

        if(!valid){

            return res.send("Wrong password")

        }

        req.session.user = user

        res.redirect("/dashboard")

    }catch(err){

        console.log(err)
        res.send("Login error")

    }

})

/* ---------- DASHBOARD ---------- */

app.get("/dashboard",(req,res)=>{

    if(!req.session.user){
        return res.redirect("/login")
    }

    res.render("dashboard",{result:null})

})

/* ---------- PREDICT ---------- */

app.post("/predict",async(req,res)=>{

    if(!req.session.user){
        return res.redirect("/login")
    }

    try{

        console.log("\n===== NEW PREDICTION REQUEST =====")
        console.log("Input Data From Form:")
        console.log(req.body)

        const response = await axios.post(
            "http://127.0.0.1:8001/predict",
            req.body
        )

        const prediction = response.data

        console.log("\nPrediction Received From ML API:")
        console.log(JSON.stringify(prediction, null, 2))

        /* Save prediction history */

        await db.ref("history").push({
            user:req.session.user.email,
            input:req.body,
            prediction:prediction,
            time:Date.now()
        })

        console.log("\nPrediction Saved To Firebase")
        console.log("===============================\n")

        res.render("dashboard",{result:prediction})

    }
    catch(err){

        console.log("ML API error:",err.message)

        res.render("dashboard",{result:{error:"Model connection error"}})

    }

})

/* ---------- USER PROFILE HISTORY ---------- */

app.get("/profile",async(req,res)=>{

    if(!req.session.user){
        return res.redirect("/login")
    }

    const snapshot = await db.ref("history").once("value")

    const data = snapshot.val()

    const userHistory = []

    if(data){

        for(let id in data){

            if(data[id].user === req.session.user.email){

                userHistory.push(data[id])

            }

        }

    }

    res.render("profile",{history:userHistory})

})

/* ---------- LOGOUT ---------- */

app.get("/logout",(req,res)=>{

    req.session.destroy(()=>{
        res.redirect("/login")
    })

})

/* ---------- SERVER ---------- */

const PORT = 3000

app.listen(PORT,()=>{

    console.log("🚀 Brand Diffusion Generator running at http://localhost:"+PORT)

})