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
            'Cookie': '_zap=2a6192f6-8259-4b94-bc43-1b06544ae81e; _xsrf=JXi8fslKSzS29KMXCgNq448wB2ixkife; d_c0="AJAtdzoSsA-PTudtdA736QeW_N9Apxhv_ds=|1562293976"; z_c0=Mi4xUXdQd0FRQUFBQUFBa0MxM09oS3dEeGNBQUFCaEFsVk5Dd1VNWGdCbEpndWFqZXo5aVFYcjgwOW8wNkRMWmJEU1hB|1562294027|20c5f01e0dc5836c598b8b3a43665bf57d3025f1; __utmv=51854390.100-1|2=registration_date=20150803=1^3=entry_date=20150803=1; __utma=51854390.1541920326.1562409633.1569834581.1571101309.7; __utmz=51854390.1571101309.7.5.utmcsr=zhihu.com|utmccn=(referral)|utmcmd=referral|utmcct=/hot; tshl=; q_c1=ce477c22ff54426e920e78cbd8890319|1573402118000|1562409630000; Hm_lvt_98beee57fd2ef70ccdd5ca52b9740c49=1575011843,1575088690,1575098838,1575099349; tst=h; tgw_l7_route=73af20938a97f63d9b695ad561c4c10c; Hm_lpvt_98beee57fd2ef70ccdd5ca52b9740c49=1575105495'
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
    constructor(id) {
        this.id = id,
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