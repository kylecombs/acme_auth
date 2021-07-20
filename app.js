const express = require('express');
const app = express();
app.use(express.json());
const { models: { User }} = require('./db');
const path = require('path');
const JWT = require('jsonwebtoken')

const token = async (req, res, next) => {
    try {
        const token = req.headers.authorization
        const user = await User.byToken(token)
        req.user = user
        next()
    } catch (error) {
        next(error)
    }

}

app.get('/', (req, res)=> res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/auth', async(req, res, next)=> {
  try {
    res.send({ token: JWT.sign({userId: req.body.username}, process.env.JWT)});
  }
  catch(ex){
    next(ex);
  }
});

app.get('/api/auth', token, async(req, res, next)=> {
  try {
    if (req.user) {
        console.log('req.user --> ', req.user)
        res.send(req.user)
    } 
  }
  catch(ex){
    next(ex);
  }
});

app.use((err, req, res, next)=> {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;