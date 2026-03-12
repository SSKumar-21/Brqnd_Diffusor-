const express = require("express")
const bodyParser = require("body-parser")
const session = require("express-session")
const db = require("./firebase")

const app = express()

app.set("view engine","ejs")

app.use(express.static("public"))
app.use(bodyParser.urlencoded({extended:true}))

app.use(session({
secret:"admin_secret",
resave:false,
saveUninitialized:false
}))


/* ---------------- ADMIN LOGIN PAGE ---------------- */

app.get("/",(req,res)=>{
res.render("adminLogin")
})


/* ---------------- LOGIN ---------------- */

app.post("/login",(req,res)=>{

const {username,password} = req.body

// test admin credentials
if(username === "123" && password === "123"){
req.session.admin = true
res.redirect("/dashboard")
}else{
res.send("Invalid Admin Login")
}

})


/* ---------------- DASHBOARD ---------------- */

app.get("/dashboard", async (req,res)=>{

if(!req.session.admin) return res.redirect("/")

const usersSnap = await db.ref("users").once("value")
const users = usersSnap.val() || {}

res.render("dashboard",{users})

})


/* ---------------- USER ACTIVITY PAGE ---------------- */

app.get("/userActivity/:email", async (req,res)=>{

if(!req.session.admin) return res.redirect("/")

const email = req.params.email

const historySnap = await db.ref("history").once("value")
const history = historySnap.val() || {}

let userHistory = []

// keep firebase key so we can delete later
for(let key in history){

if(history[key].user === email){

userHistory.push({
key:key,
...history[key]
})

}

}

res.render("activity",{email,userHistory})

})


/* ===================================================
   DELETE USER  (User + All Activity)
=================================================== */

app.get("/deleteUser/:id", async (req,res)=>{

if(!req.session.admin) return res.redirect("/")

const userId = req.params.id

// get user email
const userSnap = await db.ref("users/"+userId).once("value")
const user = userSnap.val()

if(user){

const email = user.email

// delete user
await db.ref("users/"+userId).remove()

// delete all activity of that user
const historySnap = await db.ref("history").once("value")
const history = historySnap.val() || {}

for(let key in history){

if(history[key].user === email){
await db.ref("history/"+key).remove()
}

}

}

res.redirect("/dashboard")

})


/* ===================================================
   DELETE SINGLE ACTIVITY
=================================================== */

app.post("/deleteActivity/:id", async (req,res)=>{

    if(!req.session.admin) return res.redirect("/")
    
    const activityId = req.params.id
    
    // get activity data first
    const snap = await db.ref("history/"+activityId).once("value")
    const activity = snap.val()
    
    if(activity){
    
    const email = activity.user
    
    // delete activity
    await db.ref("history/"+activityId).remove()
    
    // redirect back to that user's activity page
    return res.redirect("/userActivity/"+email)
    
    }
    
    res.redirect("/dashboard")
    
    })


/* ---------------- LOGOUT ---------------- */

app.get("/logout",(req,res)=>{
req.session.destroy(()=>{
res.redirect("/")
})
})


/* ---------------- SERVER ---------------- */

app.listen(4000,()=>{
console.log("Admin Portal running on http://localhost:4000")
})