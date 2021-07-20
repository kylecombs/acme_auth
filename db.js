const Sequelize = require('sequelize');
const { STRING } = Sequelize;
const config = {
  logging: false
};
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt')

if(process.env.LOGGING){
  delete config.logging;
}
const conn = new Sequelize(process.env.DATABASE_URL || 'postgres://localhost/acme_db', config);

const User = conn.define('user', {
  username: STRING,
  password: STRING
});

const Note = conn.define('note', {
    text: STRING
})

Note.belongsTo(User)
User.hasMany(Note)

User.beforeCreate(async (user, options) => {
    const hashedPassword = await bcrypt.hash(user.password, 5);
    user.password = hashedPassword;
  });

User.byToken = async(token)=> {
  try {
    const response = jwt.verify(token, process.env.JWT);
    // response = { userId: ... }
    const user = await User.findByPk(response.userId);
    if(user){
      return user;
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
  catch(ex){
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};

User.authenticate = async({ username, password })=> {

  const verifyPassword = async (passwordEntered, hashedPassword) => {
      const isValid = await bcrypt.compare(passwordEntered, hashedPassword)
      return isValid
  } 

  const user = await User.findOne({
    where: {
      username
    }
  });

  if(verifyPassword(password, user.password)){
    // we are returning outside of the authenticate function the user id, which we then store as the "token" in our app.post
    // instead of sending the user.id back, we are going to send back the token
    // sign(payload, secret)
    const token = jwt.sign({ userId: user.id }, process.env.JWT);
    console.log('this is my token?', token);
    // return user.id;
    return token;
  }
  const error = Error('bad credentials');
  error.status = 401;
  throw error;
};

const syncAndSeed = async()=> {
  await conn.sync({ force: true });
  const credentials = [
    { username: 'lucy', password: 'lucy_pw'},
    { username: 'moe', password: 'moe_pw'},
    { username: 'larry', password: 'larry_pw'}
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map( credential => User.create(credential))
  );

  const notes = [
      {text: 'hello'},
      {text: 'world'},
      {text: 'foo'},
      {text: 'bar'}
  ]

  const [hello, world, foo, bar] = await Promise.all(
    notes.map( note => Note.create(note) )
  )

  await lucy.setNotes(hello)
  await moe.setNotes([world, foo]) 

  return {
    users: {
      lucy,
      moe,
      larry
    },
    notes: {
        hello,
        world,
        foo,
        bar
    }
  };
};


module.exports = {
  syncAndSeed,
  models: {
    User,
    Note
  }
};