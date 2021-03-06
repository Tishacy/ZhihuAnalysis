const express = require('express');
const fetch = require('node-fetch');
const jsdom = require('jsdom');
const zhihu = require('./utils');
require('dotenv').config();
const { JSDOM } = jsdom;

// Initialize the server
const app = new express();
const port = process.env.PORT || 80;
app.listen(port, '0.0.0.0', () => console.log('Listen at 80'));
app.use(express.static('public'));
app.use(express.json());

let imagePools = {};

async function fillImagePool(sessId, quest, offset, limit) {
    let json = await quest.iterAnswers({offset, limit});
    let answers = json.data;
    let paging = json.paging;
    while (imagePools[sessId].size < imagePools[sessId].minSize && (!paging.is_end || paging.is_start)) {
        answers.forEach(answer => {
            const imageUrls = quest.extractImages(answer);
            imageUrls.forEach(imageUrl => {
                imagePools[sessId].inPool({
                    answerId: answer.id,
                    author: answer.author,
                    imageUrl: imageUrl,
                    voteupCount: answer.voteup_count
                })
            })
        })
        offset += limit;
        json = await quest.iterAnswers({offset, limit});
        answers = json.data;
        paging = json.paging;
    }
    
    return {
        'answers': answers,
        'paging': paging,
        'offset': offset
    };
}


// 获取批次图片信息
app.get("/batch", async (request, response) => {
    const query = request.query;
    let { id, limit, offset, batch_size, timestamp } = query;
    limit = parseInt(limit);
    offset = parseInt(offset);
    let sessId = id + timestamp;
    
    const quest = new zhihu.Question(id);
    const imageInfos = [];
    offset = offset || 0;
    limit = limit || 20;
    batch_size = batch_size || 15;

    // 如果是获取问题的第一批数据，就创建一个新的图片池
    // Initialize the image pool
    if (offset == 0) {
        imagePools[sessId] = new zhihu.ImagePool(sessId);
    }
    if (!imagePools[sessId]) {
        return
    }
    console.log(`\n>>> [${sessId}] Before filling image pool => offset: ${offset}, pool size: ${imagePools[sessId].size}`);

    // 填充图片池
    const fillJson = await fillImagePool(sessId, quest, offset, limit);
    let { answers, paging } = fillJson;
    offset = fillJson.offset;
    console.log(`>>> [${sessId}] After filling image pool => offset: ${offset}, pool size: ${imagePools[sessId].size}`);
    
    // 从图片池中获取图片
    batch_size = (imagePools[sessId].size < batch_size)?  imagePools[sessId].size : batch_size;
    for (let i=0; i<batch_size;  i++) {
        const imageInfo = imagePools[sessId].outPool();
        imageInfos.push(imageInfo[0]);
    }
    console.log(`>>> [${sessId}] Get 15 images => offset: ${offset}, pool size: ${imagePools[sessId].size}`);
    console.log(`>>> [${sessId}] Pool is empty?`, imagePools[sessId].isEmpty());
    console.log(`>>> ImagePools ${Object.keys(imagePools)}`)

    responseJson = {
        data: imageInfos,
        paging: paging,
        pool_is_empty: imagePools[sessId].isEmpty(),
        offset: offset
    }
    response.json(responseJson);

    // 回收某问题的imagePool
    if (imagePools[sessId].isEmpty()) {
        delete imagePools[sessId];
    }
})

// 获取回答用户信息
app.get('/member', async (request, response) => {
    const { url_token } = request.query;
    const errorJson = {
        'error': 404,
        'errorMsg': 'Member not found.'
    };
    if (url_token) {
        const memberAPI = `https://www.zhihu.com/api/v4/members/${url_token}?include=allow_message%2Cis_followed%2Cis_following%2Cis_org%2Cis_blocking%2Cemployments%2Canswer_count%2Cfollower_count%2Carticles_count%2Cgender%2Cbadge%5B%3F(type%3Dbest_answerer)%5D.topics`;
        const res = await fetch(memberAPI);
        if (res.status === 200) {
            const memberJson = await res.json();
            response.json(memberJson);
        } else {
            response.json(errorJson);
        }
    } else {
        response.json(errorJson);
    }
})

// 获取问题信息
app.get('/question', async (request, response) => {
    const { id } = request.query;
    const questAPI = `https://www.zhihu.com/api/v4/questions/${id}`;
    const questPage = `https://www.zhihu.com/question/${id}`;
    const apiRes = await fetch(questAPI);
    const questJson = await apiRes.json();
    const htmlRes = await fetch(questPage);
    const html = await htmlRes.text();
    const dom = (new JSDOM(html)).window.document;
    questJson.answerCount = dom.querySelector('meta[itemProp="answerCount"]').attributes['content'].textContent;
    response.json(questJson);
})
