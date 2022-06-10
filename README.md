# bliDanMu
cocos获取blibli的弹幕
### 配置
在BliConfig中配置
```javascript
    /** 开放平台的access_key_id*/
    export const accessKeyId: string = "********";
    /** 开放平台的access_key_secret */
    export const accessKeySecret: string = "***********";
    /** 开放房间的roomId */
    export const roomId: number = ******;
```
### 使用方法
**第一步**
建立websocket链接
```javascript
   BliSign.getInstance().getWebsocketInfoViaPass();
```
**第二步**
在游戏内监听抛出来的弹幕信息
```javascript
   cc.director.on("BliEvent",(data)=>{
            console.log("弹幕的具体数据", data);
   });
```
