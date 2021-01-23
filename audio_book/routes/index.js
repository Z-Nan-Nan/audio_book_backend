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
        r_id: res[0].rId
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
      r_id: `r_${md5(this.request.body.account)}`,
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
  console.log(this.request.body.rId);
  const res = await DB.find('user_info', {r_id: this.request.body.rId});
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
    const ret = await DB.find('user', {r_id: res[0].comment[i].author});
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


// 发送课程购买的相关信息
router.post('/get_book_grouplist', async function (next) {
  let obj = {};
  if (this.request.body.grade !== undefined) {
    obj.grade = this.request.body.grade;
  }
  if (this.request.body.tag !== undefined) {
    obj.tag = this.request.body.tag;
  }
  const res = await DB.find('book_group_list', obj);
  for (let i in res) {
    res[i].buy = false;
    res[i].pay = false;
    for (let j in res[i].hasBuy) {
      if (res[i].hasBuy[j] === this.request.body.r_id) {
        res[i].buy = true;
      }
    }
    for (let j in res[i].hasPay) {
      if (res[i].hasPay[j] === this.request.body.r_id) {
        res[i].pay = true;
      }
    }
    res[i].tag = '';
    for (let k = 0; k < res[i].tags.length; k++) {
      if (k !== res[i].tags.length - 1) {
        res[i].tag += `${res[i].tags[k]}/`;
      } else {
        res[i].tag += `${res[i].tags[k]}`;
      }
    }
  }
  const arr = [];
  for (let i in res) {
    if (!res[i].pay) {
      arr.push(res[i]);
    }
  }
  this.body = {
    status: 1,
    data: {
      voc_count: 99999,
      list: arr
    }
  };
});


// 购物车添加或删除商品
router.post('/post_shoppingcart_info', async function (next) {
  let gId = this.request.body.groupId;
  let id = this.request.body.r_id;
  let res = await DB.find('book_group_list', {group_id: gId});
  if (this.request.body.buy) {
    let flag = false;
    for (let j in res[0].hasBuy) {
      if (res[0].hasBuy[j] === id) {
        flag = true;
      }
    }
    if (!flag) {
      res[0].hasBuy.push(id);
    }
  } else {
    res[0].hasBuy.splice(res[0].hasBuy.findIndex(e => e === id), 1);
  }
  ret = await DB.update('book_group_list', {group_id: gId}, res[0]);
  if (ret.result.ok === 1) {
    this.body = {
      status: 1,
      data: {}
    };
  }
});


// 书单详情页数据获取
router.get('/get_course_info_detail', async function (next) {
  console.log(this.request.ctx.query.group_id);
  let res = await DB.find('user', {r_id: this.request.ctx.query.r_id});
  const now_voc1 = await DB.find('user_info', {r_id: this.request.ctx.query.r_id});
  const now_voc =now_voc1[0].now_voc;
  let ret = await DB.find('book_group_list', {group_id: this.request.ctx.query.group_id});
  ret[0].grade_cn = ret[0].grade === 0 ? '入门级' : ret[0].grade === 1 ? '经典级' : ret[0].grade === 2 ? '进阶级' : '高阶';
  const startDate = ret[0].date.split('-')[0];
  const endDate = ret[0].date.split('-')[1];
  ret[0].date_cn = `开课：${new Date(startDate).getMonth() < 9 ? 0 : ''}${new Date(startDate).getMonth() + 1}月${new Date(startDate).getDate()}日 - 结课：${new Date(endDate).getMonth() < 9 ? 0 : ''}${new Date(endDate).getMonth() + 1}月${new Date(endDate).getDate()}日`;
  ret[0].tag_cn = `${ret[0].tags[0]}/${ret[0].tags[1]}/${ret[0].tags[2]}`;
  ret[0].is_fit = now_voc > ret[0].fit_voc ? true : false;
  ret[0].books_detail = [];
  for (let i in ret[0].book_list) {
    const result = await DB.find('book_info', {book_id: ret[0].book_list[i].book_id});
    ret[0].books_detail.push(result[0]);
  }
  for (let i in ret[0].books_detail) {
    for (let j in ret[0].books_detail[i].hot_comments) {
      let flag = true;
      for (let z in ret[0].books_detail[i].hot_comments[j].like_men) {
        if (ret[0].books_detail[i].hot_comments[j].like_men[z] === this.request.ctx.query.r_id) {
          flag = false;
        }
      }
      if (flag) {
        ret[0].books_detail[i].hot_comments[j].is_like = false;
      } else {
        ret[0].books_detail[i].hot_comments[j].is_like = true;
      }
    }
  }
  this.body = {
    status: 1,
    data: ret[0]
  }
});

// 个人信息页获取
router.get('/get_person_info', async function (next) {
  const res = await DB.find('user', {r_id: this.request.ctx.query.r_id});
  const ret = await DB.find('user_info', {r_id: this.request.ctx.query.r_id});
  delete res[0].password;
  res[0].info_detail = ret[0];
  this.body = {
    status: 1,
    data: res[0]
  }
});

module.exports = router;

