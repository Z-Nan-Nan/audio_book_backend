var router = require('koa-router')();
var DB = require('./../module/db');
var md5 = require('./../tools/useMd5');

router.get('/', function *(next) {
  yield this.render('index', {
    title: 'Hello World Koa!'
  });
});

router.get('/foo', function *(next) {
  yield this.render('index', {
    title: 'Hello World foo!'
  });
});


//登录
router.post('/login', async function(ctx) {
  console.log(this.request);
  const res = await DB.find('user', {account: this.request.body.account});
  if (res.length === 0) {
    this.body = {
      status: 0,
      desc: '账号不存在'
    }
  } else {
    if (this.request.body.password === res[0].password) {
      this.body = {
        status: 1,
        desc: '登录成功',
        rId: res[0].rId
      }
    } else {
      this.body = {
        status: 2,
        desc: '密码错误'
      }
    }
  }
  console.log(res);
});


// 注册
router.post('/sign', async function(ctx) {
  const userYear = new Date(this.request.body.age).getFullYear();
  const nowYear = new Date().getFullYear();
  const findRes = await DB.find('user', {account: this.request.body.account});
  if (findRes.length !== 0) {
    this.body = {
      status: 0,
      desc: '该账号已被占用'
    }
  } else {
    const res = await DB.insert('user', {
      rId: `r_${md5(this.request.body.account)}`,
      account: this.request.body.account,
      password: this.request.body.password,
      nickname: this.request.body.nickname,
      sex: this.request.body.sex,
      age: nowYear - userYear});
    if (res.result.ok == 1) {
      this.body = {
        status: 1,
        desc: '注册成功'
      }
    } else {
      this.body = {
        status: 2,
        desc: '注册失败'
      }
    }
  }
  // const res = await DB.insert('user', {account: this.request.body.userIdLength})
});

// 获取每日一句
router.get('/top_pic', function *(next) {
  // console.log(`${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}`);
  const arr = [];
  let date = `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}`;
  for (let i = 0; i < 3; i++) {
    const res = yield DB.find('daily_pic', {date: date});
    arr.push(res[0]);
    const temp = new Date(date).valueOf() - 86400;
    date = `${new Date(temp).getFullYear()}/${new Date(temp).getMonth() + 1}/${new Date(temp).getDate()}`
    // console.log(`${new Date(temp).getFullYear()}/${new Date(temp).getMonth() + 1}/${new Date(temp).getDate()}`);
  }
  this.body = {
    status: 1,
    data: {
      pic: arr
    }
  }
});

// 获取用户today界面的今日数据
router.post('/get_user_today_info', async function (next) {
  const res = await DB.find('user_info', {rId: this.request.body.rId});
  const arr = [];
  for (let i in res[0].is_read_book) {
    const ret = await DB.find('book_info', {book_id: res[0].is_read_book[i].book_id});
    const obj = ret[0];
    obj.is_chapter = res[0].is_read_book[i].reading_chapter;
    if (obj.is_chapter === obj.chapter_num[obj.chapter_num.length]){
      obj.is_done = true;
    } else {
      obj.is_done = false;
    }
    delete obj.chapter_num;
    arr.push(obj);
  }
  let count = 0;
  for (let i in res[0].week_info[res[0].is_week - 1]) {
    count += parseInt(res[0].week_info[res[0].is_week - 1][i]);
  }
  const course = {
    count: parseInt(count),
    week: res[0].is_week
  };
  this.body = {
    status: 1,
    data: {
      books_info: arr,
      course_info: course
    }
  }
});


// 获取pgc的文章列表
router.get('/get_pgc_list', function *(next) {
  const res = yield DB.find('pgc_list');
  console.log(res);
  const arr = [];
  for (let i in res) {
    let tag = '';
    switch (res[i].type) {
      case '0':
        tag = '书单故事';
        break;
      case '1':
        tag = '看见TA们';
        break;
      case '2':
        tag = 'Mint News';
        break;
      case '3':
        tag = '浅荷话题';
        break;
    }
    const obj = {
      a_id: res[i].a_id,
      tag: tag,
      title: res[i].title,
      subTitle: res[i].sub_title,
      like: res[i].like,
      cover: res[i].cover
    };
    arr.push(obj);
  }
  console.log(arr);
  this.body = {
    status: 1,
    data: {
      pgc_list: arr
    }
  };
});


// 获取pgc文章的详细内容
router.post('/get_article_detail', async function (next) {
  const res = await DB.find('pgc_list', {a_id: this.request.body.a_id});
  let isLike = false;
  for (let i in res[0].like_men) {
    if (res[0].like_men[i] === this.request.body.r_id) {
      isLike = true;
    }
  }
  for (let i in res[0].comment) {
    const ret = await DB.find('user', {rId: res[0].comment[i].author});
    res[0].comment[i].author_info = ret[0];
    res[0].comment[i].comment_is_like = false;
    for (let j in res[0].comment[i].like_men) {
      if (res[0].comment[i].like_men[j] === this.request.body.r_id) {
        res[0].comment[i].comment_is_like = true;
      }
    }
  }
  this.body = {
    status: 1,
    data: {
      article: res[0],
      is_like: isLike
    }
  }
});


// 发送新评论
router.post('/send_new_comment', async function (next) {
  const res = await DB.find('pgc_list', {a_id: this.request.body.a_id});
  const obj = {
    status: 'online',
    top: true,
    kind: 'hot',
    content: this.request.body.comment,
    author: this.request.body.r_id,
    like: 0,
    like_men: []
  };
  res[0].comment.push(obj);
  const ret = await DB.update('pgc_list', {a_id: this.request.body.a_id}, res[0]);
  if (ret.result.ok === 1) {
    this.body = {
      status: 1,
      data: {}
    }
  }
});

module.exports = router;

