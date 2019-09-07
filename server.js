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

// 获取批次图片信息
app.get("/batch", async (request, response) => {
    const query = request.query;
    let { id, limit, offset } = query;
    const quest = new zhihu.Question(id);
    const questData = [];
    const imageInfos = [];
    offset = offset || 0,
    limit = limit || 20;
    
    const json = await quest.iterAnswers({offset, limit});
    const answers = json.data;
    const paging = json.paging;
    answers.forEach(answer => {
        questData.push(answer);
        const imageUrls = quest.extractImages(answer);
        imageUrls.forEach(imageUrl => {
            imageInfos.push({
                answerId: answer.id,
                author: answer.author,
                imageUrl: imageUrl,
                voteupCount: answer.voteup_count
            })
        })
    })
    offset += limit;
    
    responseJson = {
        question: (paging.is_end)? [] : answers[0].question,
        data: imageInfos,
        paging: paging
    }
    response.json(responseJson);
})
// '127.0.0.1:3000/batch?id=299205851'

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
// '127.0.0.1:3000/member?url_token=qwertyuiop-34-47'

// (async () => {
//     const quest = new zhihu.Question(id=270011746);    
//     const questData = [];
//     const imageInfos = [];
//     const maxNum = 25;
//     let offset = 0;
//     let limit = 10;
//     let isEnd = false;

//     // while (!isEnd && offset <= maxNum) {
//     // get answers
//     const json = await quest.iterAnswers({
//         offset: offset,
//         limit: limit
//     });
//     json.data.forEach(async answer => {
//         questData.push(answer);
//         // console.log(answer);
//         // get images from answer
//         const imageUrls = quest.extractImages(answer);
//         // console.log(imageUrls);
//         imageUrls.forEach(imageUrl => {
//             imageInfos.push({
//                 author: answer.author,
//                 imageUrl: imageUrl,
//                 voteupCount: answer.voteup_count
//             })
//         })
//         console.log(imageInfos.slice(-1));
//     })
//     offset += limit;
//     if (json.paging.is_end) {
//         isEnd = true;
//     }
//     // }
//     console.log(`Num of questions: ${questData.length}`);
//     console.log(`Num of images: ${imageInfos.length}`)

// })();
