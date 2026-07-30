const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
   googleId: {
     type: String,
     required: true,
     unique: true
   },

   email: {
     type: String,
     required: true,
     unique: true
   },

   name: {
    type: String,
    default: ""
   },

   profession: {
    type: String,
    default: ""
   },

   bio: {
     type: String, 
     default: "" 
    },


  isProfileComplete: { 
    type: Boolean, 
    default: false
   },


  updatedAt: {
     type: Date,
      default: Date.now
     },

   createAt: {
     type: Date,
     default: Date.now
   }

});


module.exports = mongoose.model("User", userSchema);