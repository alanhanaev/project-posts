

module.exports=function(app) {
// connect the api routes under /api/*
app.use('/api/auth', require('../apiControllers/authApi'));
app.use('/api/news', require('../apiControllers/newsApi'));
}