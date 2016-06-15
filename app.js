var express = require('express')
var path = require('path')
var bodyParser = require('body-parser')
var crypto = require('crypto')
var session = require('express-session')
var MongoStore = require('connect-mongo')(session)
var moment = require('moment')
var port = 3000
var app = express()
var mongoose = require('mongoose')
var checkLogin = require('./checkLogin.js')

mongoose.connect('mongodb://localhost:27017/notes')
mongoose.connection.on('error', console.error.bind(console, '连接数据库失败'))

//引入模块并实例化
var models = require('./models/models');
var User = models.User;
var Note = models.Note;


// 设置视图文件存放目录
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// 设置静态文件存放目录
app.use(express.static(path.join(__dirname, 'public')))

// 解析 urlencoded 请求体必备
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

// 建立 session 模型
app.use(session({
    key: 'session',
    secret: 'Keboard cat',
    cookie: {maxAge: 1000 * 60 * 60 * 24},
    store: new MongoStore({
        db: 'notes',
        mongooseConnection: mongoose.connection
    }),
    resave: false,
    saveUninitialized: true
}));
app.get('/', checkLogin.noLogin);
//get请求
app.get('/', function(req, res) {
	//传递给页面需要的信息
	Note.find({author: req.session.user.username})
		.exec(function(err, arts) {
			if(err) {
				console.log(err)
				return res.redirect('/')
			}
			res.render('index', {
				title: '笔记列表',
				user: req.session.user,
				arts: arts,
				moment: moment
			});
		})
})

//get请求
app.get('/signup', function(req, res) {
	//传递给页面需要的信息
	res.render('register', {
        title: '注册',
        user: req.session.user,
		page: 'reg'
	})
})

//post请求
app.post('/signup', function(req, res) {
	
	//req.body可以获得表单的每一块内容
	var username = req.body.username,
		password = req.body.password,
		passwordRepeat = req.body.passwordRepeat;

	//检查两次密码是否相同
	if(password != passwordRepeat) {
		console.log('两次输入的密码不相同');
		return res.redirect('/signup')
	}

	//检查用户名是否存在
	//findOne（）通过传递一个参数，获取跟这个参数有关的第一条数据
	User.findOne({username: username}, function(err, user) {
		
		if(err) {
			console.log(err);
			return res.redirect('/signup');
		}

		if(user) {
			console.log('用户名已存在');
			return res.redirect('/signup');
		}

		//对密码进行md5加密
		var md5 = crypto.createHash('md5'),
			md5password = md5.update(password).digest('hex');

		//新建user对象用于保存数据
		var newUser = new User({
			username: username,
			password: md5password
		})

		newUser.save(function(err, doc) {
			if(err) {
				console.log(err);
				return res.redirect('/signup')
			}
			console.log('注册成功')

			//将登录用户信息存入session中
			//考虑到保密性，记得将密码值删除，最后孩子接跳转到首页
			newUser.password = null;
			delete newUser.password;
			req.session.user = newUser;
			return res.redirect('/')
		})

	})
})

app.get('/signin', function(req, res) {
	res.render('login', {
		title: '登录',
		user: req.session.user,
		page: 'login'
	})
})

app.post('/signin', function(req,res) {
	var username = req.body.username,
		password = req.body.password

	User.findOne({username:username}, function(err, user){
		if(err) {
			console.log(err);
			return res.redirect('/signin');
		}
		if(!user) {
			console.log('用户名不存在!');
			return res.redirect('/signin');
		}
		//对密码进行md5加密
		var md5 = crypto.createHash('md5'),
			md5password = md5.update(password).digest('hex');
		if(user.password !== md5password) {
			console.log('密码错误!');
			return res.redirect('/signin')
		}
		console.log('登录成功！');
		user.password = null;
		delete user.password;
		req.session.user = user;
		return res.redirect('/');	
	})	
})

app.get('/quit', function(req, res) {
	req.session.user = null
	console.log('退出成功！')
	return res.redirect('/signin')
})

app.get('/post', function(req, res) {
	res.render('post', {
		title: '发布',
		user: req.session.user
	})
})

app.post('/post', function(req, res) {
	
	var note = new Note({
		title: req.body.title,
		author: req.session.user.username,
		tag: req.body.tag,
		content: req.body.content
	})
	note.save(function(err, doc) {
		if(err) {
			console.log(err)
			return res.redirect('/post')
		}
		console.log('文章发表成功！')
		return res.redirect('/')
	})
})

app.get('/detail/:_id', function(req, res) {
	Note.findOne({_id: req.params._id})
		.exec(function(err, art) {
			if(err) {
				console.log(err);
				return res.redirect('/')
			}
			if(art) {
				res.render('detail', {
					title:'笔记详情',
					user: req.session.user,
					art: art,
					moment: moment
				})
			}
		})
})

app.listen(port, function(req,res) {
	console.log('app is running at port ' + port)
})