const fetch = require('node-fetch');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

class Question {
    constructor(id) {
        this.id = id;
        this.api = `https://www.zhihu.com/api/v4/questions/${this.id}/answers`;
        this.requestData = {
            'include': 'data[*].is_normal,reward_info,comment_count,can_comment,content,editable_content,voteup_count,reshipment_settings,comment_permission,created_time,updated_time,review_info,relevant_info,question,excerpt,relationship.is_authorized,is_author,voting,is_thanked,is_nothelp,is_labeled;data[*].mark_infos[*].url;data[*].author.follower_count,badge[*].topics',
            'limit': 5,
            'offset': 0,
            'platform': 'desktop',
            'sort_by': 'default'
        };
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.110 Safari/537.36',
            'Cookie': '_zap=e6e5276a-da2d-41db-93dd-04e53d3e5718; d_c0="ABACjRUbEQyPTj7vaqafdwXR1SeMjCZwU28=|1500086380"; _ga=GA1.2.1884465342.1500086390; q_c1=0c18ac92434e461dbf10b1a96aa98139|1508241496000|1499843035000; __DAYU_PP=anaiVqQnmVEQuyFeqJ3Nffffffff8b7e007324df; _xsrf=CxDEygIODPlbzsiOxDTa60vN5JUhWGEa; __gads=ID=e191c789dec1bf4c:T=1540214568:S=ALNI_MbqMRDDJJ5nN5TvMh_QdvQckwQByw; z_c0=Mi4xUXdQd0FRQUFBQUFBRUFLTkZSc1JEQmNBQUFCaEFsVk5aYW5QWFFCMVQxYWppNHlRa2FtTmxtaDNNYVNub29SYVZR|1558338405|3b58741b6b2a88c4665e2c24615def459e556272; __utmv=51854390.100-1|2=registration_date=20150803=1^3=entry_date=20150803=1; tst=h; __utma=51854390.1884465342.1500086390.1559031016.1559405089.2; __utmz=51854390.1559405089.2.2.utmcsr=zhihu.com|utmccn=(referral)|utmcmd=referral|utmcct=/hot; q_c1=0c18ac92434e461dbf10b1a96aa98139|1560526127000|1499843035000; tgw_l7_route=4860b599c6644634a0abcd4d10d37251; tshl='
        }
    }

    async iterAnswers({limit, offset}) {
        this.requestData.limit = limit || 5;
        this.requestData.offset = offset || 0;

        const options = {
            headers: this.headers
        }
        const formedData = (() => {
            let data = '';
            for (let key in this.requestData) {
                data += `&${key}=${this.requestData[key]}`;
            }
            return data;
        })();
        const url = `${this.api}?${formedData}`;
        const res = await fetch(url, options);
        const json = await res.json();

        this.currentPageAnswers = json.data;
        this.currentPagingInfo = json.paging;
        return json;
    }

    extractImages(answer) {
        // console.log(content);
        const dom = (new JSDOM(answer.content)).window.document;
        const images = [...dom.querySelectorAll('img.lazy')];
        answer.imageUrls = [];
        images.forEach(img => {
            if (img.attributes['data-original']) {
                answer.imageUrls.push(img.attributes['data-original'].textContent);
            }else if (img.attributes['data-actualsrc']) {
                answer.imageUrls.push(img.attributes['data-actualsrc'].textContent);
            }
        });
        return answer.imageUrls;
    }
}

class ImagePool {
    constructor() {
        this.pool = [],
        this.minSize = 30,
        this.size = this.pool.length
    }
    inPool(imageJson) {
        this.pool.push(imageJson);
        this.size ++;
        return this
    }
    outPool() {
        this.size --;
        return this.pool.splice(0, 1);
    }
    isEmpty() {
        return (this.pool.length === 0);
    }
}


module.exports = {
    Question,
    ImagePool
}