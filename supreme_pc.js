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
            keyWord: 'Knit,Panel,Stripe',
            default_item_code: '',
            actual_item_code: '',
            preferSize_1: 'Large',
            preferSize_2: 'Medium',
            preferColor: 'Black'
        },
        {
            keyWord: 'Striped,Rib,Sweatpant',
            default_item_code: '',
            actual_item_code: '',
            preferSize_1: 'Large',
            preferSize_2: 'Medium',
            preferColor: 'Black'
        },
        {
            keyWord: 'GORE-TEX,6-Panel',
            default_item_code: '',
            actual_item_code: '',
            preferSize_1: 'Large',
            preferSize_2: 'Medium',
            preferColor: 'Black'
        }];

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

function matchName(itemName, keyWords) {
    let name = itemName.toLowerCase().trim();
    let keyWordsList = keyWords.toLowerCase().split(",");
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
        for (let index = 0; index < newProducts.length; index ++) {
        let item =newProducts[index];
        if (item != null && item['name'] != null && matchName(item['name'], keyWord)) {
            imageNameUrl = item.image_url.split("/");
            imageName = imageNameUrl[imageNameUrl.length - 1]
            imageId = imageName.split(".")[0]
            items[toButIndex].default_item_code = imageId
            returnValue = true
        }
    }
    }
    return returnValue;
}

async function monitor() {
    refreshed = false;
        
    let respond = await retryFetch(mobile_stock_api);
    refreshed = respond == null ? false : await mobileAPIRefreshed(respond);
    console.log(items)
    if (refreshed) {
        respondJSON = respond;
        startTime = new Date();
        console.log("Detect Page refreshed with endpoint at: " + startTime.toISOString());
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
                let temp_code = items[i].default_item_code;
                if (img_url.match(temp_code) || img_alt.match(temp_code)) {
                    urls.push(url);
                    urlToItem[url] = items[i]
                }
                if (urls.length === items.length) break;
            }
        }
        return urls
    }

async function start() {
        let itemUrls = getUrls();
        let index = 0;
        loop(itemUrls);
                
        function loop(arr) {
            addItem(arr[index], function() {
                index ++;
                if (index < arr.length) {
                    loop(arr);
                } else {
                    setTimeout(function() {
                        checkout();
                    }, 0);
                }
            });
        }

        // open new window and add item to cart
        async function addItem(itemUrl, callback) {
            wins[itemUrl] = window.open(itemUrl, '_blank');
            waitTillPageLoad();

            async function waitTillPageLoad() {
                let win = wins[itemUrl];

                if($(win.document).find("#img-main")[0]) {
                    console.log("page: " + itemUrl +  " opened successfully ....")
                    // select color here
                    if (win.document.getElementsByClassName('styles')[0]) {
                        if (win.document.getElementsByClassName('styles')[0].getElementsByTagName("li")) {
                            let styleHtmlList = win.document.getElementsByClassName('styles')[0].getElementsByTagName("li")
                            for (let k = 0; k < styleHtmlList.length; k ++) {
                                let tempStyle = styleHtmlList[k]
                                let selected_item = urlToItem[itemUrl];
                                if (tempStyle.getElementsByTagName("a")[0].getAttribute("data-style-name") == selected_item.preferColor) {
                                    // console.log(tempStyle)
                                    // win.document.getElementsByName('st')[0].value = tempStyle.getElementsByTagName("a")[0].getAttribute("data-style-id")
                                    tempStyle.getElementsByTagName("a")[0].click()
                                    console.log("selected color for item: " + itemUrl)
                                }
                            }
                        }
                    }
                    await sleep(100);
                    if ($(win.document).find('select')[0]) {
                        for(let j = 0; j < $(win.document).find('select')[0].options.length; j ++) {
                            let select = $(win.document).find('select')[0];
                            let selected_item = urlToItem[itemUrl];
                            if (select.options[j].text === (selected_item.preferSize_2)) {
                                select.selectedIndex = j;
                            } else if (select.options[j].text === (selected_item.preferSize_1)) {
                                select.selectedIndex = j;
                                break
                            }
                        }
                        console.log("selected size for item: " + itemUrl)
                    }

                    // if sold out, skip
                    if (win.document.getElementsByName('commit')[0]) {
                        win.document.getElementsByName('commit')[0].click();
                    }

                    callback();
                    
            } else {
                setTimeout(function() {
                        waitTillPageLoad();
                    }, 10)
            }        
        }        
    }

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