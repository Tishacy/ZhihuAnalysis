class WaterFall {
    constructor({ container, items, cols }) {
        this.container = container;
        this.items = [...items];
        this.cols = cols;
        this.status = 0;
        this.organize();
        window.onresize = () => {
            this.organize();
        };
    }
    organize() {
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
}
