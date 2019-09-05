// 瀑布流
class WaterFall {
    constructor({ container, items, cols }) {
        this.container = container;
        this.items = [...items];
        this.status = 0;
        this.cols = cols;
        this.colsType = (this.cols === -1)? 'auto' : 'fixed';
        this.organize();
        window.addEventListener('resize', () => {
            this.organize();
        }, false);
    }
    organize() {
        this.cols = this._getCols();
        this.containerWidth = this.container.offsetWidth;
        this.itemWidth = this.containerWidth / this.cols;
        // this.cols = Math.floor(this.containerWidth / this.itemWidth);
        this.container.style.position = "relative";
        this.items.forEach(item => {
            item.style.width = this.itemWidth + "px";
        })
        this.heightArr = [];
        const itemsArr = [...this.items];

        itemsArr.forEach((item, i) => {
            this.organizeItem(i);
        });
        this.status = 1;
    }
    organizeItem(itemIndex) {
        const item = this.items[itemIndex];
        item.style.position = "absolute";
        if (itemIndex < this.cols) {
            this.heightArr.push(item.offsetHeight);
            item.style.top = "0px";
            item.style.left = this.itemWidth * itemIndex + "px";
        } else {
            const minHeight = Math.min.apply(this, this.heightArr); // asdf
            const minHeightIndex = this._getIndex(minHeight, this.heightArr);
            item.style.top = minHeight + "px";
            item.style.left = this.itemWidth * minHeightIndex + "px";
            this.heightArr[minHeightIndex] += item.offsetHeight;
        }
    }
    appendItem(item) {
        this.container.appendChild(item);
        const itemIndex = this.items.length;
        this.items.push(item);
        this.organizeItem(itemIndex);
    }
    _getIndex(val, arr) {
        const len = arr.length;
        for (let i = 0; i < len; i++) {
            if (val === arr[i]) {
                return i;
            }
        }
        return -1;
    }
    _getCols() {
        let cols = parseInt(this.cols);
        if (this.colsType === 'fixed') {
            // 固定列数
            cols = (cols > 4)? 4 : cols;
        } else if (this.colsType === 'auto') {
            // 根据屏幕宽度自动设置列数
            const viewWidth = window.innerWidth;
            if (viewWidth <= 350) {
                cols = 1
            } else if (viewWidth > 350 && viewWidth <= 720) {
                cols = 2
            } else if (viewWidth > 720 && viewWidth <= 1090) {
                cols = 3
            } else {
                cols = 4
            }
        } else {
            console.error('Wrong cols type.');
        }
        return cols;
    }
}

// 页面创建瀑布流
const waterFall = new WaterFall({
    container: $("#waterfall-container")[0],
    items: $(".waterfall-item"),
    cols: -1
});
let pagingIsEnd = false;
let query = getQuery();
query.limit = 1;
query.offset = 0;
getFirstBatch(query);

// Functions
async function getFirstBatch (query) {
    const json = await getBatch(query);
    const imageInfos = await json.data;
    const paging = json.paging;
    let minHeight = Math.min(...waterFall.heightArr);
    let maxHeight = Math.max(...waterFall.heightArr);
    minHeight = (minHeight == Infinity || minHeight == -Infinity)? 0 : minHeight;
    maxHeight = (maxHeight == Infinity || maxHeight == -Infinity)? 0 : maxHeight;
    // console.log(waterFall.heightArr, minHeight, maxHeight);

    if (minHeight < 500 && !pagingIsEnd) {
        query.offset += query.limit;
        getFirstBatch(query);
    }
}

async function getBatch(query) {
    console.log(`getting batch: ${query.offset}`);
    const apiUrl = formatAPIUrl('/api', query);
    const res = await fetch(apiUrl);
    const json = await res.json();
    const question = json.question;
    const imageInfos = json.data;
    const paging = json.paging;

    if (paging.is_start) {
        $('h3.question').text(question.title);
    } else if (paging.is_end) {
        pagingIsEnd = true;
        console.log("This is the end");
        organizeFooter();
    }
    imageInfos.forEach((imageInfo, index) => {
        const imageUrl = imageInfo.imageUrl;
        const answerId = imageInfo.answerId;
        const avatarUrl = imageInfo.author.avatar_url;
        const authorName = imageInfo.author.name;
        const authorUrlToken = imageInfo.author.url_token;
        const voteupCount = imageInfo.voteupCount;
        const $waterFallItem = $(`<div href="javascript:;" class="image-container waterfall-item">
                <div class="image-wrapper">
                    <img src="" class="pic" alt="" data-src="${imageUrl}"/>
                    <div class="info-container">
                        <a href="https://www.zhihu.com/people/${authorUrlToken}/activities" target="_blank" class="avatar-wrapper">
                            <img class="avatar" src="${avatarUrl}" alt="" onerror="this.src='./static/avatar_template.jpg'">
                        </a>
                        <a href="https://www.zhihu.com/people/${authorUrlToken}/activities" target="_blank" class="author" title="${authorName}">${authorName}</a>
                        <a href="https://www.zhihu.com/question/${question.id}/answer/${answerId}" target="_blank" class="answer">A</a>
                        <span class="voteup"><i></i>${voteupCount}</span>
                    </div>
                </div>
        </div>`)
        const $waterFallImage = $waterFallItem.find('img.pic');
        $waterFallItem.css({
            'visibility': 'hidden'
        });

        $('#waterfall-container').append($waterFallItem);
        $waterFallImage.attr('src', $waterFallImage.attr('data-src'));
        $waterFallImage.on('load', function () {
            $waterFallItem.css({
                'visibility': 'visible'
            });
            waterFall.appendItem($waterFallItem[0]);
            waterFall.organize();
            if (pagingIsEnd) {
                organizeFooter();
            }
        });
        $waterFallImage.on('error', function () {
            // 加载失败时就隐藏该区块
            $(this).parents('.waterfall-item').css({
                'display': 'none'
            })
        });
        // 如果图片数量太少，就下次增加 query.limit
        if (imageInfos.length < 10) {
            query.limit = 20;
        }
    })
    return json;
}
function getQuery() {
    const params = document.location.search.slice(1).split('&');
    const query = {};
    for (let param of params) {
        param = param.split('=');
        query[param[0]] = param[1]
    }
    return query;
}
function formatAPIUrl(route, query) {
    let apiUrl = route + '?';
    for (let key in query) {
        apiUrl += `${key}=${query[key]}&`
    }
    return apiUrl.slice(0, -1);
}
function organizeFooter() {
    const waterFallHeight = Math.max(...waterFall.heightArr);
    const top = (waterFallHeight > 500)? waterFallHeight+20 : 500;
    $('footer').css({
        'position': 'absolute',
        'top': top + `px`,
        'display': 'block'
    })
}


// 事件监听
let key = true;
window.addEventListener('scroll', headerToggle, false);
window.addEventListener('scroll', loadNewBatch, false);

function headerToggle() {
    // header的显示与隐藏
    if ($(window).scrollTop() > 100) {
        $('header .logo-wrapper').slideUp('fast');
    } else {
        $('header .logo-wrapper').slideDown('fast')
    }
}
async function loadNewBatch() {
    // 加载新批次数据
    if (pagingIsEnd) {
        window.removeEventListener('scroll', loadNewBatch);
    }
    const pageHeight = document.body.scrollHeight;
    const scrollHeight = window.scrollY + 572;
    if (scrollHeight >= 0.8 * pageHeight && key) {
        key = false;
        query.offset += query.limit;
        const batchData = await getBatch(query);
        if (batchData) {
            key = true;
        }
    }
}

// 动态创建的元素需要事件委托绑定事件
$('.main-container').delegate('.waterfall-item', 'mouseenter', function () {
    $(this).find('.info-container').stop().fadeIn(300);
});
$('.main-container').delegate('.waterfall-item', 'mouseleave', function () {
    $(this).find('.info-container').stop().fadeOut(300);
});
$('.main-container').delegate('.waterfall-item .image-wrapper img', 'click', function () {
    const imageUrl = $(this).attr('src');
    $('.image-mask-wrapper .image-wrapper img').attr('src', imageUrl);
    $('.image-mask-wrapper').stop().fadeIn(300);
})
$('.image-mask-wrapper .close-mask').click(function () {
    $('.image-mask-wrapper').stop().fadeOut(300);
})

let timer;
$('.back-to-top').click(() => {
    timer = setInterval(() => {
        if ($(window).scrollTop() >= 100) {
            window.scrollBy(0, -100);
        } else if ($(window).scrollTop() > 0) {
            window.scrollBy(0, -10);
        } 

        if ($(window).scrollTop() === 0) {
            clearInterval(timer);
        }
    }, 1)
})

window.addEventListener('resize', function () {
    if (pagingIsEnd) {
        organizeFooter();
    }
}, false);
