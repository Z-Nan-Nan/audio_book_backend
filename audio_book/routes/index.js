var router = require('koa-router')();
var DB = require('./../module/db');
var md5 = require('./../tools/useMd5');
var dayjs = require('dayjs');

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
        r_id: res[0].r_id
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
      p_id: res[i].p_id,
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
  const res = await DB.find('pgc_list', {p_id: this.request.body.p_id});
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

// 获取书架数据
router.get('/get_user_bookshelf_info', async function (next) {
  const res = await DB.find('user_info', {r_id: this.request.ctx.query.r_id});
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
    obj.cover = obj.img_src;
    obj.bookName = obj.name_cn;
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
    data: arr
  }
});


// 获取书本分享页数据
router.get('/get_share_book_info', async function(next) {
  const res = await DB.find('book_info', {book_id: this.request.ctx.query.book_id});
  const ret = await DB.find('user_info', {r_id: this.request.ctx.query.r_id});
  const result = await DB.find('user', {r_id: this.request.ctx.query.r_id});
  const result1 = await DB.find('temp_save', {r_id: this.request.ctx.query.r_id});
  for (let i in ret[0].is_read_book) {
    if (ret[0].is_read_book[i].book_id === this.request.ctx.query.book_id) {
        ret[0].find_book = ret[0].is_read_book[i];
        ret[0].find_book.rank = (i * 1) + 1;
        ret[0].find_book.date = `${new Date().getFullYear()}.${new Date().getMonth() + 1}.${new Date().getDate()}`;
    }
  }
  ret[0].book_detail = res[0];
  ret[0].user_detail = result[0];
  for (const i in result1[0].collection) {
    if (result1[0].collection[i].key === 'share_comment') {
      ret[0].share_comment = result1[0].collection[i].value;
    }
  }
  this.body = {
    status: 1,
    data: ret[0]
  }
});


// 暂时存储
router.post('/save_temp_data', async function(next) {
  const res = await DB.find('temp_save', {r_id: this.request.body.r_id});
  if (res.length === 0) {
    const ret = await DB.insert('temp_save', {
      r_id: this.request.body.r_id,
      collection: [
        {
          key: this.request.body.key,
          value: this.request.body.value
        }
      ]
    });
    if (ret.result.ok === 1) {
      this.body = {
        status: 1,
        data: 'ok'
      }
    }
  } else {
    var flag = true;
    for (const i in res[0].collection) {
      if (res[0].collection[i].key === this.request.body.key) {
        res[0].collection[i].value = this.request.body.value;
        flag = false;
      }
    }
    if (flag) {
      res[0].collection.push({
        key: this.request.body.key,
        value: this.request.body.value
      });
    }
    const result = await DB.update('temp_save', { r_id: this.request.body.r_id }, res[0]);
    if (result.result.ok === 1) {
      this.body = {
        status: 1,
        data: 'ok'
      }
    }
  }
});


// 日历界面获取数据
router.get('/get_calender_info', async function(next) {
  const res = await DB.find('user_info', { r_id: this.request.ctx.query.r_id});
  const ret = await DB.find('book_group_list', { group_id: res[0].is_read_book_group });
  res[0].book_group_info = [];
  res[0].days_list = [
    {
      year: 2021,
      month: ret[0].term_start_month,
      startDay: new Date(`2021/${ret[0].term_start_month}/01`).getDay(),
      days: []
    },
    {
      year: 2021,
      month: ret[0].term_start_month + 1,
      startDay: new Date(`2021/${ret[0].term_start_month + 1}/01`).getDay(),
      days: []
    },
    {
      year: 2021,
      month: ret[0].term_start_month + 2,
      startDay: new Date(`2021/${ret[0].term_start_month + 2}/01`).getDay(),
      days: []
    },
  ];
  let flag = false;
  let day_num = 1;
  for (const i in res[0].days_list) {
    const count = new Date(2021, res[0].days_list[i].month, 0).getDate();
    if (flag) {
      for (let j = 0; j < count; j++) {
        res[0].days_list[i].days.push({read: 0});
      }
    } else if (i !== '0') {
      if (res[0].study_info.length - day_num >= count) {
        for (let j = 0; j < count; j++) {
          res[0].days_list[i].days.push({read: res[0].study_info[j]});
          day_num++;
        }
      } else {
        const hasAdd = day_num;
        const l = res[0].study_info.length - day_num;
        for (let j = 0; j < l + 1; j++) {
          res[0].days_list[i].days.push({read: res[0].study_info[j + hasAdd - 1]});
          console.log(j + hasAdd);
          day_num++;
        }
        const len = count - res[0].days_list[i].days.length;
        for (let j = 0; j < len; j++) {
          res[0].days_list[i].days.push({read: 0});
        }
        flag = true;
      }
    }
    if (i === '0') {
      for (let j = 0; j < ret[0].term_start_day -1; j++) {
        res[0].days_list[i].days.push({read: 0});
      }
      for (let j = 0; j < Math.min(count - ret[0].term_start_day + 1, res[0].study_info.length); j++) {
        res[0].days_list[i].days.push({read: res[0].study_info[j]});
        day_num++;
      }
      const last = count - res[0].days_list[i].days.length;
      if (last !== 0) {
        for (let x = 0; x < last - 1; x++) {
          res[0].days_list[i].days.push({read: 0});
          day_num++;
          flag = true;
        }
      }
    }
    console.log(res[0].days_list[i]);
  }
  for (const i in ret[0].book_list) {
    const result = await DB.find('book_info', { book_id: ret[0].book_list[i].book_id });
    res[0].book_group_info.push(result[0]);
  }
  res[0].day_num = day_num;
  res[0].book_group = ret[0];
  this.body = {
    status: 1,
    data: res[0]
  };
});


// 有声书存储
router.get('/get_audio_book_data', async function(next){
  let json = JSON.parse(json1);
  const arr = [];
  const arr1 = new Set();
  for (const i in json.sentences) {
    arr.push(json.sentences[i].content);
    if (arr1.size < 10) {
      if (json.sentences[i].content_style.indexOf('{*8') > -1) {
        let temp = json.sentences[i].content_style.split('{*8');
        arr1.add(temp[0].split(' ').pop());
      }
    }
  }
  const ret = await DB.insert('article_info', { a_id : 'a_0011', book_id: 'b_0001', day: 11 });
  if (ret.result.ok === 1) {
    const res = await DB.find('article_info', { a_id: 'a_0011'});
    res[0].sentences = arr;
    res[0].raw_word = Array.from(arr1);
    res[0].previous_story = json.previous_story;
    res[0].audio = json.audios;
    res[0].audio.audio_times = json.audios.audio_times;
    const ret = await DB.update('article_info', { a_id: 'a_0011'}, res[0]);
    console.log(ret.result.ok);
    this.body = {
      status: 1,
      data: '测试成功'
    };
  }
});


// 获取有声书数据
router.get('/get_audio_book_info', async function(next){
  const res = await DB.find('article_info', { a_id: this.request.ctx.query.a_id, book_id:this.request.ctx.query.b_id });
  const ret = await DB.find('book_info', { book_id: this.request.ctx.query.b_id });
  const res1 = await DB.find('user_info', { r_id: this.request.ctx.query.r_id });
  for (const i in res1[0].reading_note) {
    if (res1[0].reading_note[i].a_id === this.request.ctx.query.a_id && res1[0].reading_note[i].book_id === this.request.ctx.query.b_id) {
      res[0].note_collection = res1[0].reading_note[i].notes;
    }
  }
  res[0].chapter_collection = ret[0].chapter_num;
  let str = '';
  for(let i = 0; i < 10; i++) {
    str += res[0].raw_word[i].toLowerCase();
    if (i !== 9) {
      str += '/';
    }
  }
  res[0].string_word = str;
  this.body = {
    status: 1,
    data: res[0]
  };
});


// 存储笔记数据
router.post('/send_article_note', async function(next){
  const res = await DB.find('user_info', {r_id: this.request.body.r_id });
  var flag = true;
  for (const i in res[0].reading_note) {
    if (res[0].reading_note[i].a_id === this.request.body.a_id && res[0].reading_note[i].book_id === this.request.body.b_id) {
      var flag = false;
      var flag1 = true;
      for (const j in res[0].reading_note[i].notes) {
        if (res[0].reading_note[i].notes[j].pos === this.request.body.pos) {
          res[0].reading_note[i].notes[j].content = this.request.body.content;
          flag1  =false;
        }
      } 
      if (flag1) {
        res[0].reading_note[i].notes.push({
          pos: this.request.body.pos,
          content: this.request.body.content
        });
      }
    }
  }
  if (flag) {
    res[0].reading_note.push({
      a_id: this.request.body.a_id,
      book_id: this.request.body.b_id,
      notes: [{
        date: `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate}`,
        pos: this.request.body.pos,
        content: this.request.body.content
      }]
    });
  }
  const ret = await DB.update('user_info', {r_id: this.request.body.r_id}, res[0]);
  if (ret.result.ok === 1) {
    this.body = {
      status: 1,
      data: 'ok'
    }
  }
});


// 获取题目数据
router.get('/get_question_data', async function(next){
  const j1 = JSON.stringify();
  const json = JSON.parse(j1);
  const res = await DB.find('article_info', {a_id: 'a_0005', book_id: 'b_0001'});
  res[0].question = json;
  const ret = await DB.update('article_info', {a_id: 'a_0005', book_id: 'b_0001'}, res[0]);
  if (ret.result.ok === 1) {
    this.body = {
      status: 1,
      data: 'ok'
    };
  }
});


// 获取题目信息
router.get('/get_question_info', async function(next){
  const res = await DB.find('article_info', { a_id: this.request.ctx.query.a_id, book_id: this.request.ctx.query.book_id});
  this.body = {
    status: 1,
    data: res[0].question
  };
});


// 获取笔记数据
router.get('/get_note_info', async function(next){
  const res = await DB.find('user_info', { r_id: this.request.ctx.query.r_id });
  for (const i in res[0].reading_note) {
    const ret = await DB.find('book_info', {book_id :res[0].reading_note[i].book_id});
    res[0].reading_note[i].name_cn = ret[0].name_cn
  }
  const arr = [];
  for (const i in res[0].reading_note) {
    for (const j in res[0].reading_note[i].notes) {
      res[0].reading_note[i].notes[j].a_id = res[0].reading_note[i].a_id;
      res[0].reading_note[i].notes[j].book_id = res[0].reading_note[i].book_id;
      res[0].reading_note[i].notes[j].name_cn = res[0].reading_note[i].name_cn;
      arr.push(res[0].reading_note[i].notes[j]);
    }
  }
  for (const i in arr) {
    const result = await DB.find('article_info', { a_id: arr[i].a_id, book_id: arr[i].book_id });
    arr[i].sentence = result[0].sentences[arr[i].pos];
    arr[i].day = result[0].day;
  }
  this.body = {
    status: 1,
    data: arr
  };
});


// 记录当天阅读数据
router.post('/send_read_info', async function(next){
  const res = await DB.find('user_info', { r_id: this.request.body.r_id });
  if (res[0].week_info[res[0].is_week - 1].length === 7) {
    res[0].week_info.push([]);
    res[0].is_week++;
  }
  console.log(typeof res[0].week_info[res[0].is_week - 1]);
  res[0].week_info[res[0].is_week - 1].push(this.request.body.right_num);
  const result = await DB.find('book_group_list', { group_id: res[0].is_read_book_group });
  const d = new Date(2021, result[0].term_start_month, result[0].term_start_day);
  const start = dayjs(d);
  let trueNow = start.add(res[0].study_info.length, 'day');
  if (trueNow.isBefore(dayjs())) {
    res[0].study_info.push(2);
  } else {
    res[0].study_info.push(1);
  }
  const ret = await DB.update('user_info', { r_id: this.request.body.r_id }, res[0]);
  if (ret.result.ok === 1) {
    this.body = {
      status: 1,
      data: 'ok'
    };
  }
});


// 获取金薄荷任务完成情况
router.get('/get_gold_info', async function(next){
  const res = await DB.find('user_info', { r_id: this.request.ctx.query.r_id });
  let rightCount = 0;
  for (const i in res[0].week_info[res[0].is_week - 1]) {
    rightCount += res[0].week_info[res[0].is_week - 1][i];
  }
  const ret = await DB.find('book_group_list', { group_id: res[0].is_read_book_group });
  this.body = {
    status: 1,
    data: {
      is_week: res[0].is_week,
      day_num: 7 - res[0].week_info[res[0].is_week - 1].length,
      right_count: rightCount,
      finish_num: finishNum,
      group_name: ret[0].name
    }
  }
});


// 后台端
// 获得所有学生列表
router.get('/all_student_info', async function(next){
  let box = [];
  let res = [];
  if (this.request.ctx.query.id !== undefined || this.request.ctx.query.name !== undefined) {
    const reg_id = new RegExp(this.request.ctx.query.id,'i');
    const reg_name = new RegExp(this.request.ctx.query.name,'i');
    const params = {
      r_id: reg_id,
      nickname: reg_name
    };
    for (const i in params) {
      if (params[i] === undefined) {
        delete params[i];
      }
    }
    res = await DB.find('user', params);
    for (const i in res) {
      box.push(res[i]);
    }
  } else {
    res = await DB.find('user', {});
    if (res.length < 10) {
      box = res;
    } else {
      for (let index = (parseInt(this.request.ctx.query.page) - 1) * 10; index < parseInt(this.request.ctx.query.page) * 10; index++) {
        box.push(res[index]);
      }
    }
  }
  for (const i in box) {
    const ret = await DB.find('user_info', { r_id: box[i].r_id });
    box[i].vocab_count = ret.length === 0 ? '未测试' : ret[0].now_voc;
    const result = ret.length === 0 ? '未有在读书单' : await DB.find('book_group_list', { group_id: ret[0].is_read_book_group });
    box[i].group_name = ret.length === 0 ? result : `${result[0].name}${result[0].term}期`;
  }
  this.body = {
    status: 1,
    count: res.length,
    data: box
  }
});


// 获取每日一句信息
router.get('/get_daily_pic', async function(next){
  const res = await DB.find('daily_pic', {});
  const box = res.reverse().slice(15 * (this.request.ctx.query.page - 1), this.request.ctx.query.page === 1 ? 15 : this.request.ctx.query.page * 15);
  this.body = {
    status: 1,
    count: res.length,
    data: box
  }
});


// 新建每日一句
router.post('/send_daily_pic', async function(next) {
  const object = {
    date: this.request.body.date,
    src: this.request.body.src
  };
  const result = await DB.insert('daily_pic', object);
  if (result.result.ok === 1) {
    this.body = {
      status: 1,
      msg: 'ok'
    }
  }
});


// 获取所有书籍
router.get('/get_all_book', async function(next) {
  let res;
  let box = [];
  if (this.request.ctx.query.name === undefined) {
    res = await DB.find('book_info', {});
  } else {
    const reg_name = new RegExp(this.request.ctx.query.name,'i');
    res = await DB.find('book_info', { name_cn: reg_name });
  }
  if (res.length > 20) {
    box = res.slice(20 * (this.request.ctx.query.page - 1), this.request.ctx.query.page === 1 ? 20 : this.request.ctx.query.page * 20);
  } else {
    box = res;
  }
  const ret = await DB.find('book_group_list', {});
  for (const i in ret) {
    for (const index in ret[i].book_list) {
      for (const j in box) {
        if (box[j].book_id === ret[i].book_list[index].book_id) {
          if (box[j].book_group === undefined) {
            box[j].book_group = ret[i].name;
          } else {
            box[j].book_group += `+${ret[i].name}`;
          }
        }
      }
    }
  }
  this.body = {
    status: 1,
    count: res.length <= 20 ? box.length : res.length,
    data: box
  }
});


// 新建书籍
router.post('/send_new_book', async function(next) {
  const res = await DB.find('book_info', {});
  const obj = this.request.body.obj;
  obj.term = `${obj.term}`;
  obj.book_id = `b_00${res.length >= 9 ? res.length + 1 : 0}${res.length < 9 ? res.length + 1 : ''}`;
  obj.chapter_num = [];
  obj.words = parseInt(obj.words);
  for (let i = 0; i < parseInt(obj.chapter); i++) {
    obj.chapter_num.push(`${i + 1}`);
  }
  delete obj.chapter;
  for (const i in obj.book_group) {
    const result = await DB.find('book_group_list', { group_id: obj.book_group[i] });
    result[0].book_list.push(
      {
        book_id: obj.book_id,
        name_cn: obj.name_cn
      }
    );
    const result1 = await DB.update('book_group_list', { group_id: obj.book_group[i] }, result[0]);
  }
  delete obj.book_group;
  const ret = await DB.insert('book_info', obj);
  if (ret.result.ok === 1) {
    this.body = {
      status: 1,
      msg: 'ok'
    };
  }
});


// 修改书籍
router.post('/update_book', async function(next) {
  if (this.request.body.new_chapter !== '') {
    let json = JSON.parse(`${this.request.body.new_chapter}`);
    const arr = [];
    const arr1 = new Set();
    for (const i in json.sentences) {
      arr.push(json.sentences[i].content);
      if (arr1.size < 10) {
        if (json.sentences[i].content_style.indexOf('{*8') > -1) {
          let temp = json.sentences[i].content_style.split('{*8');
          arr1.add(temp[0].split(' ').pop());
        }
      }
    }
    const ret = await DB.insert('article_info', { 
      a_id : `a_00${this.request.body.chapter_num.length >= 9 ? this.request.body.chapter_num.length + 1 : 0}${this.request.body.chapter_num.length < 9 ? this.request.body.chapter_num.length + 1 : ''}`,
      book_id: this.request.body.book_id,
      day: this.request.body.chapter_num.length + 1,
      sentences: [],
      raw_word: [],
      previous_story: '',
      audio: []});
    if (ret.result.ok === 1) {
      const res = await DB.find('article_info', { day: this.request.body.chapter_num.length + 1 });
      res[0].sentences = arr;
      res[0].raw_word = Array.from(arr1);
      res[0].previous_story = json.previous_story;
      res[0].audio = json.audios;
      res[0].audio.audio_times = json.audios.audio_times;
      const ret = await DB.update('article_info', { day: this.request.body.chapter_num.length + 1 }, res[0]);
    }
  }
  if (this.request.body.new_chapter !== '') {
    this.request.body.chapter_num.push(`${this.request.body.chapter_num.length + 1}`);
  }
  delete this.request.body.new_chapter;
  const result = await DB.update('book_info', { book_id: this.request.body.book_id }, this.request.body);
    if (result.result.ok === 1) {
      this.body = {
        status: 1,
        msg: 'ok'
      }
    }
});


// 获取所有书单
router.get('/get_all_book_group', async function(next) {
  let box = [];
  let res;
  if (this.request.ctx.query.name === undefined) {
    res = await DB.find('book_group_list', {});
  } else {
    const reg_name = new RegExp(this.request.ctx.query.name,'i');
    res = await DB.find('book_group_list', { name: reg_name });
  }
  if (res.length > 20) {
    box = res.slice(20 * (this.request.ctx.query.page - 1), this.request.ctx.query.page === 1 ? 20 : this.request.ctx.query.page * 20);
  } else {
    box = res;
  }
  this.body = {
    status: 1,
    count: res.length <= 20 ? box.length : res.length,
    data: box
  }
});


// 新建书单
router.post('/send_new_book_group', async function(next){
  const res = await DB.insert('book_group_list', this.request.body.data);
  if (res.result.ok === 1) {
    this.body = {
      status: 1,
      msg: 'ok'
    };
  }
});


//获得社区文章列表
router.get('/get_all_pgc_list', async function(next) {
  let count = {
    read: 0,
    like: 0,
    comment: 0,
    comment_like: 0,
    online_comment: 0
  };
  let res = await DB.find('pgc_list', {});
  for (const i in res) {
    count.read += res[i].read_num;
    count.like += res[i].like,
    count.comment += res[i].comment.length;
    for (const j in res[i].comment) {
      count.comment_like += res[i].comment[j].like;
      if (res[i].comment[j].status === 'online') {
        count.online_comment++;
      }
    }
  }
  if (this.request.ctx.query.channel !== '4') {
    res = await DB.find('pgc_list', { type: `${this.request.ctx.query.channel}` });
  }
  let box = [];
  if (res.length > 10) {
    box = res.slice(10 * (this.request.ctx.query.page - 1), this.request.ctx.query.page === 1 ? 10 : this.request.ctx.query.page * 10);
  } else {
    box = res;
  }
  for (const i in box) {
    let contentH  = '';
    for (const index in box[i].content) {
      contentH += `<p><img src=${box[i].content[index]} /></p>`;
    }
    box[i].content = contentH;
  }
  this.body = {
    status: 1,
    data: box,
    count: count,
    article_count: res.length
  }
});


// 新建社区文章
router.post('/new_pgc_article', async function(next){
  const res = await DB.find('pgc_list', {});
  const arr = this.request.body.content.split('"');
  this.request.body.content = [];
  this.request.body.type = this.request.body.type.toString();
  this.request.body.read_num = parseInt(this.request.body.read_num);
  this.request.body.like = parseInt(this.request.body.like);
  if (this.request.body.p_id === undefined) {
    this.request.body.is_online = false;
  }
  this.request.body.comment = [];
  for (let i = 1; i < arr.length; i+=2) {
    if (arr[i].indexOf('https:') > -1) {
      this.request.body.content.push(arr[i]);
    }
    this.request.body.content.push(`https:${arr[i]}`);
  }
  let ret;
  if (this.request.body.p_id !== undefined) {
    delete this.request.body._id;
    ret = await DB.update('pgc_list', { p_id : this.request.body.p_id }, this.request.body);
  } else {
    this.request.body.p_id = `p_00${res.length >= 9 ? res.length + 1 : 0}${res.length < 9 ? res.length + 1 : ''}`;
    ret = await DB.insert('pgc_list', this.request.body);
  }
  if (ret.result.ok === 1) {
    this.body = {
      status: 1,
      msg: 'ok'
    }
  }
});


// 修改评论条件
router.post('/update_comment', async function(next) {
  const searchArr = this.request.body.id.split('_');
  const commentId = searchArr.pop();
  const res = await DB.find('pgc_list', { p_id: searchArr.join('_') });
  for (const i in res[0].comment) {
    if (res[0].comment[i].c_id === this.request.body.id) {
      res[0].comment[i].top = this.request.body.top === undefined ? res[0].comment[i].top : this.request.body.top;
      res[0].comment[i].status = this.request.body.status === undefined ? res[0].comment[i].status : this.request.body.status;
    }
  }
  const ret = await DB.update('pgc_list', { p_id: searchArr.join('_') }, res[0]);
  if (ret.result.ok === 1) {
    this.body = {
      status: 1,
      msg: 'ok'
    };
  }
});


module.exports = router;

