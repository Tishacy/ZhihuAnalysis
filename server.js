const express = require('express');
const zhihu = require('./utils');
require('dotenv').config();

// Initialize the server
const app = new express();
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => console.log('Listen at 3000'));
app.use(express.static('public'));
app.use(express.json());

app.get("/api", async (request, response) => {
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
