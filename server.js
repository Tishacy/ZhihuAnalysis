const express = require('express');
const fetch = require('node-fetch');
const zhihu = require('./utils');
require('dotenv').config();

// Initialize the server
const app = new express();
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => console.log('Listen at 3000'));
app.use(express.static('public'));
app.use(express.json());

let imagePool;

async function fillImagePool(quest, offset, limit) {
    let json = await quest.iterAnswers({offset, limit});
    let answers = json.data;
    let paging = json.paging;
    let question = answers[0].question;
    while (imagePool.size < imagePool.minSize && !paging.is_end) {
        answers.forEach(answer => {
            const imageUrls = quest.extractImages(answer);
            imageUrls.forEach(imageUrl => {
                imagePool.inPool({
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
    
    console.log('paging is end?', paging.is_end)
    return {
        'question': question,
        'answers': answers,
        'paging': paging
    };
}


// 获取批次图片信息
app.get("/batch", async (request, response) => {
    const query = request.query;
    let { id, limit, offset, batch_size } = query;
    const quest = new zhihu.Question(id);
    const imageInfos = [];
    offset = offset || 0;
    limit = limit || 20;
    batch_size = batch_size || 15;

    // 如果是获取问题的第一批数据，就创建一个新的图片池
    // Initialize the image pool
    if (offset == 0) {
        imagePool = new zhihu.ImagePool;
    }

    // 填充图片池
    const fillJson = await fillImagePool(quest, offset, limit);
    const { question, answers, paging } = fillJson;
    
    // 从图片池中获取图片
    batch_size = (imagePool.size < batch_size)?  imagePool.size : batch_size;
    for (let i=0; i<batch_size;  i++) {
        const imageInfo = imagePool.outPool();
        imageInfos.push(imageInfo[0]);
    }
    console.log('Pool is empty?', imagePool.isEmpty(), imagePool.size);

    responseJson = {
        question: question,
        data: imageInfos,
        paging: paging,
        pool_is_empty: imagePool.isEmpty(),
    }
    response.json(responseJson);
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
    const res = await fetch(questAPI);
    const questJson = await res.json();
    response.json(questJson);
})
