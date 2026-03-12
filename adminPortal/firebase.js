const admin = require("firebase-admin")

const serviceAccount = require("../backend/firebase-key.json")

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://adviser-platform-default-rtdb.firebaseio.com/"
})

const db = admin.database()

module.exports = db