var app = require('koa')()
  , logger = require('koa-logger')
  , json = require('koa-json')
  , views = require('koa-views')
  , onerror = require('koa-onerror');

var index = require('./routes/index');
var users = require('./routes/users');


// error handler
onerror(app);

// global middlewares
app.use(views('views', {
  root: __dirname + '/views',
  default: 'jade'
}));
app.use(require('koa-bodyparser')());
app.use(json());
app.use(logger());

app.use(function *(next){
  this.request.ctx.set("Access-Control-Allow-Origin", "*");
  this.request.ctx.set('Access-Control-Allow-Credentials', true);
  this.request.ctx.set('Access-Control-Request-Method', 'PUT,POST,GET,DELETE,OPTIONS');
  this.request.ctx.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, t');
  var start = new Date;
  yield next;
  var ms = new Date - start;
  console.log('%s %s - %s', this.method, this.url, ms);
  if (this.request.ctx.method == 'OPTIONS') {
    this.request.ctx.body = '';
    this.request.ctx.status = 204;
  }
});

app.use(require('koa-static')(__dirname + '/public'));

// routes definition
app.use(index.routes(), index.allowedMethods());
app.use(users.routes(), users.allowedMethods());

// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
});

module.exports = app;