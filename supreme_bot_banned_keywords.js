var currentTime = new Date()

var cnb = "0000000000";
var month = "11";
var year = "2020";
var vval = "000";

var billing_name = "x";
var order_email = "i@uc.edu";
var order_tel = "400-000-0000";
var order_address = "wedqwe";
var order_unit = "qwe";
var order_billing_zip = "00000";
var order_billing_city = "San Jose";
var order_billing_state = "CA";
var order_billing_country = "USA"; 
var auto_checkout = false;
var checkout_delay = 1500;

var items = [
        {
            keyWord: 'Knit,Panel',
            bannedKeyWord: 'Stripe',
            default_item_code: '',
            actual_item_code: '',
            preferSize_1: 'Large',
            preferSize_2: 'Medium',
            preferColor: 'Black',
            default_item_id: '',
            default_item_style_id: '',
            default_item_size_id: ''
        },
        {
            keyWord: 'Striped,Rib,Sweatpant',
            bannedKeyWord: 'aaa',
            default_item_code: '',
            actual_item_code: '',
            preferSize_1: 'Large',
            preferSize_2: 'Medium',
            preferColor: 'Black',
            default_item_id: '',
            default_item_style_id: '',
            default_item_size_id: ''            
        },
        {
            keyWord: 'GORE-TEX,6-Panel',
            bannedKeyWord: 'aaa',
            default_item_code: '',
            actual_item_code: '',
            preferSize_1: 'Large',
            preferSize_2: 'N/A',
            preferColor: 'Black',
            default_item_id: '',
            default_item_style_id: '',
            default_item_size_id: ''
        }
];

// dafault means, no color is associated
var urlToItem = {};

/////////////////////////////////////////////////////////////////////////////////////////
var wins = {};
var checkout_URL = "https://www.supremenewyork.com/checkout";

var mobile_stock_api = "https://www.supremenewyork.com/mobile_stock.json";

var retryFetch = async (url, options=null, retry=0) => {
    if (retry >= 4) return Promise.resolve(1);
    let res = await fetch(url, options);
    if (res.status !== 200) {
        await sleep(Math.min(retry * 500, 2 * 1000));
        return await retryFetch(url, options, retry + 1);
    } else {
        return await res.json();
    }
};

function matchName(itemName, keyWords, bannedKeyWords) {
    let name = itemName.toLowerCase().trim();
    let keyWordsList = keyWords.toLowerCase().split(",");
    let bannedKeyWordList = bannedKeyWords.toLowerCase().split(",");
    for (let i = 0; i < bannedKeyWordList.length; i ++) {
        if (name.includes(bannedKeyWordList[i].trim())) {
            return false;
        }
    }
    for (let i = 0; i < keyWordsList.length; i ++) {
        if (!name.includes(keyWordsList[i].trim())) {
            return false;
        }
    }
    return true;
}

var sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

async function mobileAPIRefreshed(respond) {
    if (respond['products_and_categories'] == null || respond['products_and_categories']['new'] == null) {
        return false;
    }
    let newProducts = respond['products_and_categories']['new'];
    let returnValue = false
    for (let toButIndex = 0; toButIndex < items.length; toButIndex ++) {
        keyWord = items[toButIndex].keyWord
        bannedKeyWord = items[toButIndex].bannedKeyWord
        for (let index = 0; index < newProducts.length; index ++) {
            let item =newProducts[index];
            if (item != null && item['name'] != null && matchName(item['name'], keyWord, bannedKeyWord)) {
                imageNameUrl = item.image_url.split("/");
                imageName = imageNameUrl[imageNameUrl.length - 1]
                imageId = imageName.split(".")[0]
                items[toButIndex].default_item_code = imageId
                items[toButIndex].default_item_id = item.id
                returnValue = true
            }
        }
    }
    return returnValue;
}

async function itemDetialJsonFetch(respond) {

}

async function monitor() {
    refreshed = false;
        
    let respond = await retryFetch(mobile_stock_api);
    refreshed = respond == null ? false : await mobileAPIRefreshed(respond);
    console.log(items)
    if (refreshed) {
        var startTime = new Date()
        console.log("Detect Page refreshed with endpoint at: " + startTime.toISOString());
        for (let i = 0; i < items.length; i ++) {
            let itemJsonRespond = await retryFetch("https://www.supremenewyork.com/shop/" + items[i].default_item_id + ".json");
            // getting the real image id by the color
            for (let style of itemJsonRespond.styles) {
                if (style.name === items[i].preferColor) {
                    let tempUrl = style.image_url.split("/")
                    items[i].actual_item_code = tempUrl[tempUrl.length - 1].split(".")[0]
                    // set item style id and size id
                    console.log('....matching: \n' + JSON.stringify(items[i]));
                    items[i].default_item_style_id = style.id;
                    for (let size of style.sizes) {
                        if (size.name === items[i].preferSize_1 && size.stock_level > 0) {
                            items[i].default_item_size_id = size.id;
                        } else if (size.name === items[i].preferSize_2) {
                            items[i].default_item_size_id = size.id;
                        }
                    }
                }
            }
        }
        // window.location.href = 'https://www.supremenewyork.com/shop/new'
        sleep(150).then(() => start());
    } else {
        await sleep(1000);
        await monitor();
    }
}

function getUrls() {
        let content = $('#container article div a').toArray();
        let urls = [];
        for (let k = 0; k < content.length; k ++) {
            let child = content[k];
            let img_url = $($(child).children()[0]).attr('src');
            let img_alt = $($(child).children()[0]).attr('alt');
            let url = $(child).attr('href');
            for (let i = 0; i < items.length; i ++) {
                let temp_code = items[i].actual_item_code;
                if (img_url.match(temp_code) || img_alt.match(temp_code)) {
                    urls.push(url);
                    urlToItem[url] = items[i]
                }
                if (urls.length === items.length) break;
            }
        }
        return urls
    }

function start() {                
        // add item to cart using POST method according to item id, style id, size id
        async function addItem(item, callback) {
            var headers = {
                'Accept': '*/*;q=0.5, text/javascript, application/javascript, application/ecmascript, application/x-ecmascript',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Origin': 'https://www.supremenewyork.com',
                'Pragma': 'no-cache',
                'Referer': 'https://www.supremenewyork.com/shop/tops-sweaters/iqbnz1ios/nmy6a3c7b',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest',
                'Cookie': document.cookie
            }

            console.log('adding item: \n' + JSON.stringify(item));

            var add_to_car_endpoint = 'https://www.supremenewyork.com/shop/' + item.default_item_id + '/add';
            var st = item.default_item_style_id; // style id
            var s = item.default_item_size_id; // size id
            var params = 'utf8=%E2%9C%93&st=' + st + '&s=' + s + '&commit=add+to+cart';

            var request = {
                method: 'POST',
                headers: headers,
                body: params,
                credentials: 'same-origin',
                cache: 'no-cache',
                mode: 'cors',
                redirect: 'follow', // manual, *follow, error
                referrer: 'no-referrer', // no-referrer, *client
            };

            await fetch(add_to_car_endpoint, request);
            console.log(`added item to cart: (id, style_id, size_id) => (${item.default_item_id}, ${st}, ${s})`);
            await sleep(150);
        }

        async function loop(arr) {
            var index = 0;
            for (index = 0; index < arr.length; index++)
            await addItem(arr[index], function() {
                console.log('looped on item ' + index);
            });
            setTimeout(function() {
                checkout();
            }, 0);
        }        

        loop(items);
    }

function payment() {
    //console.log(urls)
    let win = wins['checkout'];
    if (win.document.getElementById('checkout_form')) {
    /*
    Script to use on checkout screen
    */
        if ($(win.document).find('input#order_billing_name')[0]) {
            $(win.document).find('input#order_billing_name')[0].value = billing_name;
        }
        if ($(win.document).find('input#order_email')[0]) {
            $(win.document).find('input#order_email')[0].value = order_email;
        }
        if ($(win.document).find('input#order_tel')[0]) {
            $(win.document).find('input#order_tel')[0].value = order_tel;
        }

        if ($(win.document).find('input#bo')[0]) {
            $(win.document).find('input#bo')[0].value = order_address;
        }

        if ($(win.document).find('input#oba3')[0]) {
            $(win.document).find('input#oba3')[0].value = order_unit;
        }

        if ($(win.document).find('input#order_billing_zip')[0]) {
            $(win.document).find('input#order_billing_zip')[0].value = order_billing_zip;
        }

        if ($(win.document).find('input#order_billing_city')[0]) {
            $(win.document).find('input#order_billing_city')[0].value = order_billing_city;
        }

        if ($(win.document).find('select#order_billing_country')[0]) {
            $(win.document).find('select#order_billing_country')[0].value = order_billing_country;
            win.$('select#order_billing_country').trigger('change');
        }

        if ($(win.document).find('select#order_billing_state')[0]) {
            $(win.document).find('select#order_billing_state')[0].value = order_billing_state;
        }
    
        if ($(win.document).find('input#nnaerb')[0]) {
            $(win.document).find('input#nnaerb')[0].value = cnb;
        }
        if ($(win.document).find('select#credit_card_month')[0]) {
            $(win.document).find('select#credit_card_month')[0].value = month;
            $(win.document).find('select#credit_card_year')[0].value = year;
        }
        if ($(win.document).find('input#orcer')[0]) {
            $(win.document).find('input#orcer')[0].value = vval;
        }
        
        // Check the "I Accept Terms..." button
        if ($(win.document).find('.iCheck-helper')[1]){
            $(win.document).find('.iCheck-helper')[1].click();
        }
        if ($(win.document).find('.checkbox')[1]) {
            $(win.document).find('.checkbox')[1].click();
            console.log('prepare to pay')
            
            // auto pay here .....!
            console.log('total checkout time: ' + (new Date().getTime() - currentTime.getTime())/ 1000);
            if (auto_checkout) {
                setTimeout(() => pay(), checkout_delay)
            }

        }
    
    } else {
        setTimeout(function(){ payment(); }, 10);
        //console.log("waiting to payment...");
    }
}

function pay() {
    let win = wins['checkout']
    console.log('paid')
    win.document.getElementsByName('commit')[0].click();
}

function checkout () {
    wins['checkout'] = window.open(checkout_URL, '_blank');
    console.log('Ready for checkout!');
    payment();
}

monitor()