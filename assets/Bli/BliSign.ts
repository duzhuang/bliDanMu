import { BliConfig } from "./BliConfig";
import { BliProtocol } from "./BliProtocol";

/**
 * 建立与b站的长链接 
 */
export default class BliSign {

    private static _instance: BliSign = null;
    public static getInstance(){
        if(!BliSign._instance){
            BliSign._instance = new BliSign();
        }
        return BliSign._instance;
    }

    /** xmlHttp链接*/
    private _xhr: XMLHttpRequest = null;
    /** 第三方弹幕的链接库 */
    private _danmakuWS: DanmakuWebSocket = null;

    

    /**
     * 通过房间号获取场长链
     * @param url 获取长连接的命令
     */
    public getWebsocketInfoViaPass() {
        this._xhr = new XMLHttpRequest();
        let fullUrl = BliConfig.baseUrl + BliConfig.wsUrl;
        this._xhr.open("POST", fullUrl);
        this._xhr.onreadystatechange = _ => {
            if (this._xhr.readyState === 4 && this._xhr.status == 200) {
                let responseData = JSON.parse(this._xhr.responseText);
                this._handleHttpResponse(responseData);
            } else {
                console.log("这是错误的状态码", this._xhr.status)
            }
        }
        var param = `{"room_id":${BliConfig.roomId}}`;
        let headerData = this._getEncodeHeader(param, BliConfig.accessKeyId, BliConfig.accessKeySecret);

        this._xhr.setRequestHeader("Content-Type", `${headerData.ContentType}`);
        this._xhr.setRequestHeader("Authorization", `${headerData.Authorization}`);
        this._xhr.setRequestHeader("Accept", `${headerData.Accept}`);
        this._xhr.setRequestHeader("x-bili-accesskeyid", `${headerData["x-bili-accesskeyid"]}`);
        this._xhr.setRequestHeader("x-bili-content-md5", `${headerData["x-bili-content-md5"]}`);
        this._xhr.setRequestHeader("x-bili-signature-method", `${headerData["x-bili-signature-method"]}`);
        this._xhr.setRequestHeader("x-bili-signature-nonce", `${headerData["x-bili-signature-nonce"]}`);
        this._xhr.setRequestHeader("x-bili-signature-version", `${headerData["x-bili-signature-version"]}`);
        this._xhr.setRequestHeader("x-bili-timestamp", `${headerData["x-bili-timestamp"]}`);

        //需要具体的房间号
        this._xhr.send(param);
    }

    /**
     * 建立ws长连接
     * @param room_id 
     * @param data 
     */
    private createSocket(room_id: number, data: BliProtocol.ISocketData) {
        const opt = {
            ...this._getWebSocketConfig(room_id, data),
            // 收到消息,
            onReceivedMessage: res => {               
                let { cmd, data = {} } = res
                console.log("收到信息的处理", JSON.stringify(res));
                cc.director.emit("BliEvent", res);
                
            },
            // 收到心跳处理回调
            onHeartBeatReply: data => console.log("收到心跳处理回调:", JSON.stringify(data)),
            onError: data => console.log("error", data),
            onListConnectError: () => {
                console.log("list connect error")
            }
        }

        this.DanmakuSs = new DanmakuWebSocket(opt)

        return this.DanmakuSs;
    }

    /**
     * 从接口获取到socket端口和地址
     */
    private _getWebSocketConfig(room_id: number, data: BliProtocol.ISocketData) {
        const {
            wss_port,
            wss_port: [firWssPort],
            host,
            host: [firHost]
        } = data

        const url = `wss://${firHost}:${firWssPort}/sub`

        const urlList = host.map(
            (v, i) => `wss://${v}:${wss_port[i] || wss_port[0]}/sub`
        )

        const auth_body = JSON.parse(data.auth_body)

        return {
            url,
            urlList,
            customAuthParam: [
                {
                    key: "key",
                    value: auth_body.key,
                    type: "string"
                },
                {
                    key: "group",
                    value: auth_body.group,
                    type: "string"
                }
            ],
            rid: room_id,
            protover: 2,
            uid: auth_body.uid,
            group: auth_body.group
        }
    }

    /**
     * 处理HTTP返回的请求信息
     * @param responseData 
     */
    private _handleHttpResponse(responseData) {
        console.log("这是Http请求返回的信息", JSON.stringify(responseData));
        if (responseData.code === -400) {
            console.log("验证玩家身份成功")
        } else {
            // let addr = this.getWebSocketConfig(responseData.data).addr;
            // let authBody = this.getWebSocketConfig(responseData.data).authBody;
            this.createSocket(BliConfig.roomId, responseData.data);
        }
    }

    /**
    * 鉴权加密
    * @param params 
    * @param appKey 
    * @param appSecret 
    */
    private _getEncodeHeader(params = {}, appKey: string, appSecret: string) {
        const timestamp = parseInt(Date.now() / 1000 + "");
        const nonce = parseInt(Math.random() * 100000 + "") + timestamp;
        const header = {
            "x-bili-accesskeyid": appKey,
            // 请求体的编码值，根据请求体计算所得。算法说明：将请求体内容当作字符串进行MD5编码。
            "x-bili-content-md5": this._getMd5Content(`{"room_id":${BliConfig.roomId}}`),
            // 签名方式。取值：HMAC-SHA256
            "x-bili-signature-method": "HMAC-SHA256",
            // 签名唯一随机数。用于防止网络重放攻击，建议您每一次请求都使用不同的随机数。
            "x-bili-signature-nonce": nonce + "",
            "x-bili-signature-version": "1.0",
            // unix时间戳，单位是秒。请求时间戳不能超过当前时间10分钟，否则请求会被丢弃。
            "x-bili-timestamp": timestamp + "",
        }

        const data: string[] = []
        for (const key in header) {
            data.push(`${key}:${header[key]}`)
        }

        const signature = this._getSha256Content(appSecret, data);

        return {
            Accept: "application/json",
            "ContentType": "application/json",
            ...header,
            Authorization: signature,
        }
    }


    /**获取MD5 */
    private _getMd5Content(source: string) {
        console.log("这是当前的MD5----",MD5(source));
        return MD5(source);
    }

    /**
     * 获取Sha256
     * @param appSecret 设置的秘钥
     * @param data 需要加密的内容
     */
    private _getSha256Content(appSecret: string, data: Array<string>) {
        let temp = CryptoJS.HmacSHA256(data.join("\n"), appSecret);
        return CryptoJS.enc.Hex.stringify(temp);
    }
}