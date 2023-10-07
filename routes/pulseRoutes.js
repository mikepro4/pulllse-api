const express = require("express");
const mongoose = require("mongoose");
const passport = require('passport');
const Pulses = mongoose.model("Pulse");
const requireLogin = require('../middlewares/requireLogin');

module.exports = app => {

    // ===========================================================================


    app.post("/pulse/create", requireLogin, async (req, res) => {
        const Pulse = await new Pulses({
            dateCreated: new Date(),
            name: req.body.name,
            user: req.body.user
        }).save();
        res.json(Pulse);
    });


    // ===========================================================================

}

