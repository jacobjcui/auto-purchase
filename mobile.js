//Auto-Refresh
var keyWord = 'tagless,tees';
var categories = ["Jackets", "Coats", "Shirts", "Tops/Sweaters", "Sweatshirts", "Pants", "Shorts", "T-Shirts", "Hats", "Bags", "Accessories", "Shoes", "Skate"]
// 0 -> "Jackets", 1 -> "Coats", 2-> "Shirts", 3 -> "Tops/Sweaters", 4 ->"Sweatshirts", 5->"Pants", 6->"Shorts", 7->"T-Shirts",
//8-> "Hats", 9->"Bags", 10->"Accessories", 11->"Shoes", 12->"Skate"
var category = categories[10];
var preferredSize = 'medium'
var preferColor = 'black';
var autoCheckout = false;
var checkout_delay = 2500;

//Address info
var billing_name = "us last";
var order_email = "test@gmail.com";
var order_tel = "1112223344";
var order_address = "707 test St";
var order_billing_address_2 = "Apt48";
var order_billing_zip = "95116";
var order_billing_city = "San Jose";
var order_billing_state = "CA";
var order_billing_country = "USA"; 

// USA, CANADA
// GB, FR

//Payment info
var credit_card_type = "visa";
// 欧洲：visa, american_express, master, solo 
// 日本：visa, american_express, master, jcb, 代金的话自己手动 小写
var cnb = "4111 1111 1111 1111";
var month = "12";
var year = "2022";
var vval = "888";

var startTime = null;
var respondJSON = null;
var isNew = true;

var mobile_stock_api = "https://www.supremenewyork.com/mobile_stock.json";

var event = document.createEvent('Event');
event.initEvent('change', true, true); 

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
    for (let index = 0; index < newProducts.length; index ++) {
        let item =newProducts[index];
        if (item != null && item['name'] != null && matchName(item['name'], keyWord)) {
            isNew = true;
            return true;
        }
    }

    let categoryProduct = respond['products_and_categories'][category];
    for (let index = 0; index < categoryProduct.length; index ++) {
        let item =categoryProduct[index];
        if (item != null && item['name'] != null && matchName(item['name'], keyWord)) {
            isNew = false;
            return true;
        }
    }
    return false;
}

async function monitor() {
    refreshed = false;
        
    let respond = await retryFetch(mobile_stock_api);
    refreshed = respond == null ? false : await mobileAPIRefreshed(respond);
    if (refreshed) {
        respondJSON = respond;
        startTime = new Date();
        console.log("Detect Page refreshed with mobile endpoint at: " + startTime.toISOString());
        window.location.href = isNew? 'https://www.supremenewyork.com/mobile/#categories/new' : ('https://www.supremenewyork.com/mobile/#categories/' + category);
        sleep(150).then(() => start());
    } else {
        await sleep(1000);
        await monitor();
    }
}


var start = () => {
    var items = document.getElementsByClassName("name");
    if (items.length > 0) {

        for (item of items) {
            var name = item.innerHTML;

            if (matchName(name, keyWord)) {
                startTime = new Date().getTime();
                item.click();
                break;
            }
        }

        (function waitTillArticlePageIsOpen() {
            let atcBtn = document.getElementsByClassName("cart-button")[0];
            // check if article page has loaded by looking at main image
            if (atcBtn) {
                addToCart();
            } else
                setTimeout(function(){ waitTillArticlePageIsOpen(); }, 150);

            return;
        })();
    } else {
        setTimeout(function(){ start(); }, 150);
    }
}



async function addToCart(){
    if (document.getElementById('cart-update').children[0].innerHTML === "remove") {
        checkout();
        return;
    }
    await sleep(200);
    await chooseColor();
    await sleep(200);
    chooseSize();
    await sleep(200);
    let atcBtn = document.getElementsByClassName("cart-button")[0];
    atcBtn.click();
    
    (function waitTillCartUpdates() {
        let cart = document.getElementById("goto-cart-link").innerHTML;
        if (cart == '' || cart == 0) {
            setTimeout(function(){ waitTillCartUpdates(); }, 150);
            return;
        } else {
            // Click checkout button
            checkout()
            return;
        }
    })();
}


async function chooseColor() {
    var id;
    var url = "/shop/"+window.location.hash.split("/")[1]+".json";
    let res = await fetch(url);
    let myJson = await res.json();
    for (item of myJson.styles){
        let color = item.name;
        if (color.toLowerCase().includes(preferColor.toLowerCase())) {
            var id = item.id;
            let imageID = "style-"+id;
            let image = document.getElementById(imageID).getElementsByClassName("style-thumb")[0];    
            image.click();
            break;
        }
    }


}

function chooseSize(){
    var sizeOpts = document.getElementsByTagName("option");
    var sizeVal = sizeOpts[0].value
    for (let option of sizeOpts){
        let size = option.text.toLowerCase();
        if (size === preferredSize.toLowerCase() || size === 'N/A'){
            sizeVal =  option.value;
            break;
        }
    }
    var sizeOpts = document.getElementsByTagName("select")[0].value = sizeVal;

}

function checkout(){
    window.location.href = 'https://www.supremenewyork.com/mobile/#checkout';
    var checkoutBtn = document.getElementById("submit_button");
    waitTillCheckoutPageIsOpen();
}

async function waitTillCheckoutPageIsOpen() {

    checkoutBtn = document.getElementById("submit_button");
    if (checkoutBtn) {
        await sleep(100);
        document.getElementById("order_billing_name").focus();
        document.getElementById("order_billing_name").value = billing_name;

        await sleep(100);
        document.getElementById("order_email").focus();
        document.getElementById("order_email").value = order_email;
        await sleep(100);
        document.getElementById("order_tel").focus();
        document.getElementById("order_tel").value = order_tel;
        await sleep(100);
        document.getElementById("order_billing_address").focus();
        document.getElementById("order_billing_address").value = order_address;

        if (document.getElementById("order_billing_address_2")) {
            await sleep(100);
            document.getElementById("order_billing_address_2").focus();
            document.getElementById("order_billing_address_2").value = order_billing_address_2;
        }
    

        if (document.getElementById("obz")) {
            await sleep(100);
            document.getElementById("obz").focus();
            document.getElementById("obz").value = order_billing_zip;
        }
        if (document.getElementById("order_billing_zip")) {
            await sleep(100);
            document.getElementById("order_billing_zip").focus();
            document.getElementById("order_billing_zip").value = order_billing_zip;
        }
        await sleep(100);

        document.getElementById("order_billing_city").focus();
        document.getElementById("order_billing_city").value = order_billing_city;

        if (document.getElementById("order_billing_country")) {
            await sleep(100);
            document.getElementById("order_billing_country").value = order_billing_country;
            document.getElementById("order_billing_country").dispatchEvent(event);
        }

        if (document.getElementById("order_billing_state")) {
            await sleep(100);
            document.getElementById("order_billing_state").focus();
            document.getElementById("order_billing_state").value = order_billing_state;
            document.getElementById("order_billing_state").dispatchEvent(event);
        }
    
        if (document.getElementById("credit_card_type")) {
            await sleep(100);
            document.getElementById("credit_card_type").value = credit_card_type;
            document.getElementById("credit_card_type").dispatchEvent(event);
        }
        if (document.getElementById("credit_card_n")) {
            await sleep(100);
            document.getElementById("credit_card_n").focus();
            document.getElementById("credit_card_n").value = cnb;
        }
        if (document.getElementById("credit_card_month")) {
            await sleep(100);
            document.getElementById("credit_card_month").focus();
            document.getElementById("credit_card_month").value = month;
            document.getElementById("credit_card_month").dispatchEvent(event);
        }
        if (document.getElementById("credit_card_year")) {
            await sleep(100);
            document.getElementById("credit_card_year").focus();
            document.getElementById("credit_card_year").value = year;
            document.getElementById("credit_card_year").dispatchEvent(event);
        }
        if (document.getElementById("cav")) {
            await sleep(100);
            document.getElementById("cav").focus();
            document.getElementById("cav").value = vval;
        }
        if (document.getElementById("credit_card_cvv")) {
            await sleep(100);
            document.getElementById("credit_card_cvv").focus();
            document.getElementById("credit_card_cvv").value = vval;
        }

        await sleep(100);      
        document.getElementById("order_terms").click();
        if (autoCheckout){
            await sleep(checkout_delay);
            document.getElementById("hidden_cursor_capture").click();
        }
        console.log('paymentTime: ' + (new Date().getTime() - startTime) + ' ms');
        return;
    } else {
        setTimeout(async function(){ await waitTillCheckoutPageIsOpen(); }, 200);
        console.log("waiting to Chekcout...");
    }
}

monitor()

completion()