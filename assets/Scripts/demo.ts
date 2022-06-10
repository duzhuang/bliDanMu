import BliSign from "../Bli/BliSign";

const {ccclass, property} = cc._decorator;

@ccclass
export default class NewClass extends cc.Component {

    onLoad () {
        cc.director.on("BliEvent",(data)=>{
            console.log("可以传送的数据", data);
        });
    }

    start () {
        this.scheduleOnce(_ => {
            BliSign.getInstance().getWebsocketInfoViaPass()
        }, 1)
    }

    // update (dt) {}
}
