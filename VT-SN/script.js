// ====================== 全局数据库 ======================
let db = {
    product:[{id:1,name:"A01主板",ver:"国内版本",remark:"通用主板",status:"正常"}],
    factory:[{id:1,name:"天恒加工厂",type:"国内工厂",tel:"13800138000",status:"正常"}],
    sn:[],
    instock:[],
    outstock:[],
    error:[],
    log:[],
    user:[
        {id:1,username:"admin",pwd:"123456",role:"管理员",status:"正常"},
        {id:2,username:"user",pwd:"123456",role:"操作员",status:"正常"},
        {id:3,username:"look",pwd:"123456",role:"查看员",status:"正常"}
    ],
    backup:[]
};
let nowUser = {};
let failSnList = [];

// ====================== 19条需求核心规则 ======================
function setSelectPermission(){
    let role = nowUser.role;
    document.querySelectorAll(".opt-init,.opt-in,.opt-out").forEach(el=>el.style.display="");
    if(role === "操作员"){
        document.querySelectorAll(".opt-init,.opt-out").forEach(el=>el.style.display="none");
    }else if(role === "查看员"){
        document.querySelectorAll(".opt-init,.opt-in").forEach(el=>el.style.display="none");
    }
}
function checkSnFormat(sn){
    if(!sn) return false;
    if(sn.length !== 12) return false;
    if(!sn.startsWith("SN")) return false;
    return true;
}
function checkSnStatusChange(oldStatus,newStatus){
    let flow = {"未入库":["在库"],"在库":["已发货","异常","作废"],"已发货":[],"异常":["作废"],"作废":[]};
    return flow[oldStatus].includes(newStatus);
}
function autoSaveBackup(){
    let time = getNowTime();
    db.backup.unshift({time:time,data:JSON.stringify(db)});
    if(db.backup.length > 30) db.backup = db.backup.slice(0,30);
    saveData();
}

// ====================== 初始化测试数据 ======================
function initTestSn(){
    let arr = [];
    let statusList = ["未入库","在库","已发货","异常","作废"];
    for(let i=1;i<=20;i++){
        let sn = "SN202605"+String(i).padStart(2,"0");
        let randomStatus = statusList[Math.floor(Math.random()*5)];
        arr.push({
            id:i,sn:sn,proId:1,facId:1,batch:"P20260505",
            status:randomStatus,inTime:randomStatus=="未入库"?"":getNowTime(),
            outTime:"",cusId:"",errReason:""
        });
    }
    db.sn = arr;
    autoSaveBackup();
    saveData();
}

// ====================== 本地存储 ======================
function saveData(){localStorage.setItem("sndb",JSON.stringify(db));}
function loadData(){
    let data = localStorage.getItem("sndb");
    data ? db = JSON.parse(data) : initTestSn();
}
function getNowTime(){
    let d = new Date();
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")+":"+String(d.getSeconds()).padStart(2,"0");
}

// ====================== 登录+权限 ======================
function userLogin(){
    let u = document.getElementById("loginUser").value;
    let p = document.getElementById("loginPwd").value;
    let user = db.user.find(item=>item.username==u&&item.pwd==p);
    if(!user) return alert("账号密码错误！");
    nowUser = user;
    document.getElementById("loginPage").classList.add("hide");
    document.getElementById("mainSystem").classList.remove("hide");
    document.getElementById("nowUser").innerText = user.username+"("+user.role+")";
    permissionControl();setSelectPermission();refreshAll();
    addLog("系统登录","账号登录",nowUser.username,"登录成功，进入系统","无变更");
}
function permissionControl(){
    let role = nowUser.role;
    document.querySelectorAll(".btn-danger,.btn-gray,#editPwdBtn,#backupBtn,#menu-user,#proAddBtn,#cusAddBtn").forEach(el=>el.style.display="");
    document.querySelectorAll("#exportStockBtn,#exportAllSnBtn,#exportLogBtn").forEach(el=>el.disabled=false);
    document.querySelectorAll("#proOperTh,#cusOperTh,#inOperTh,#logOperTh,#userOperTh").forEach(el=>el.style.display="table-cell");
    if(role === "操作员"){
        document.querySelectorAll(".btn-danger,.btn-gray,#editPwdBtn,#backupBtn,#menu-user,#proAddBtn,#cusAddBtn,#logOperTh").forEach(el=>el.style.display="none");
    }else if(role === "查看员"){
        document.querySelectorAll(".btn-danger,.btn-success,.btn-warning,.btn-primary,#editPwdBtn,#backupBtn,#menu-user,#menu-instock,#menu-outstock,#menu-error,#proOperTh,#cusOperTh,#inOperTh,#userOperTh").forEach(el=>el.style.display="none");
        document.querySelectorAll("#exportStockBtn,#exportAllSnBtn,#exportLogBtn").forEach(el=>el.disabled=false);
    }
}
function logout(){
    addLog("系统退出","账号退出",nowUser.username,"退出登录","无变更");
    nowUser = {};
    document.getElementById("mainSystem").classList.add("hide");
    document.getElementById("loginPage").classList.remove("hide");
}

// ====================== 页面刷新切换 ======================
function switchPage(id){
    document.querySelectorAll("[id^='page-']").forEach(el=>el.classList.add("hide"));
    document.getElementById("page-"+id).classList.remove("hide");
    document.querySelectorAll(".sidebar-menu div").forEach(el=>el.classList.remove("active"));
    document.getElementById("menu-"+id).classList.add("active");
}
function refreshAll(){
    countStock();renderPro();renderCus();renderIn();renderOut();renderErr();renderLog();renderUser();
    appendProSelect();appendFacSelect();appendCusSelect();
}

// ====================== 库存统计（需求7） ======================
function countStock(){
    let initNum = db.sn.filter(x=>x.status=="未入库").length;
    let inNum = db.sn.filter(x=>x.status=="在库").length;
    let outNum = db.sn.filter(x=>x.status=="已发货").length;
    let errNum = db.sn.filter(x=>x.status=="异常").length;
    let delNum = db.sn.filter(x=>x.status=="作废").length;
    document.getElementById("numInit").innerText = initNum;
    document.getElementById("numIn").innerText = inNum;
    document.getElementById("numOut").innerText = outNum;
    document.getElementById("numErr").innerText = errNum;
    document.getElementById("numDel").innerText = delNum;
    let m = document.getElementById("searchModel").value;
    let f = document.getElementById("searchFac").value;
    let s = document.getElementById("searchStatus").value;
    let list = [...db.sn];
    if(m) list = list.filter(x=>db.product.find(p=>p.id==x.proId)?.name.includes(m));
    if(f) list = list.filter(x=>db.factory.find(fa=>fa.id==x.facId)?.name.includes(f));
    if(s) list = list.filter(x=>x.status==s);
    let html = "";
    db.product.forEach(pro=>{
        let arr = list.filter(x=>x.proId==pro.id);
        if(arr.length==0) return;
        let facName = db.factory.find(f=>f.id==arr[0].facId)?.name;
        let batch = arr[0].batch;
        let init = arr.filter(x=>x.status=="未入库").length;
        let inNum = arr.filter(x=>x.status=="在库").length;
        let out = arr.filter(x=>x.status=="已发货").length;
        let err = arr.filter(x=>x.status=="异常").length;
        let del = arr.filter(x=>x.status=="作废").length;
        html += `<tr><td>${pro.name}</td><td>${pro.ver}</td><td>${facName}</td><td>${batch}</td><td>${init}</td><td>${inNum}</td><td>${out}</td><td>${err}</td><td>${del}</td><td><button class="btn-primary" onclick="traceSnByPro('${pro.name}')">查看明细</button></td></tr>`;
    });
    document.getElementById("stockTbody").innerHTML = html;
}
function traceSnByPro(name){
    switchPage('trace');
    document.getElementById("traceSn").value = "";
    document.getElementById("traceFac").value = "";
    document.getElementById("traceBatch").value = "";
    document.getElementById("traceStatus").value = "";
    let pro = db.product.find(x=>x.name==name);
    let list = db.sn.filter(x=>x.proId==pro.id);
    let html = "";
    list.forEach(item=>{
        let p = db.product.find(x=>x.id==item.proId)?.name;
        let f = db.factory.find(x=>x.id==item.facId)?.name;
        let cus = db.factory.find(x=>x.id==item.cusId)?.name||"无";
        let time = item.outTime||item.inTime;
        html += `<tr><td>${item.sn}</td><td>${p}</td><td>${f}</td><td>${item.batch}</td><td>${item.status}</td><td>${cus}</td><td>${time}</td></tr>`;
    });
    document.getElementById("traceTbody").innerHTML = html;
    document.getElementById("traceInfo").innerText = "筛选产品："+name+"，共"+list.length+"条SN数据";
}

// ====================== 日志（需求13：变更记录） ======================
function addLog(type,obj,user,desc,change){
    db.log.unshift({id:Date.now(),type:type,obj:obj,user:user,desc:desc,change:change,time:getNowTime()});
    saveData();
}

// ====================== 产品管理 ======================
function renderPro(){
    let h="";
    db.product.forEach(item=>{
        h+=`<tr>
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${item.ver}</td>
            <td>${item.remark}</td>
            <td>${item.status}</td>
            <td>${nowUser.username}</td>
            <td>${getNowTime()}</td>
            <td><button class="btn-primary" onclick="editPro(${item.id})">编辑</button><button class="btn-gray" onclick="stopPro(${item.id})">停用</button></td>
        </tr>`;
    });
    document.getElementById("proTbody").innerHTML=h;
}
function addProduct(){
    let name = document.getElementById("proName").value.trim();
    let ver = document.getElementById("proVer").value;
    let remark = document.getElementById("proRemark").value.trim();
    if(!name) return alert("请输入产品型号！");
    let old = JSON.stringify(db.product);
    let id = Math.max(...db.product.map(x=>x.id),0)+1;
    db.product.push({id:id,name:name,ver:ver,remark:remark,status:"正常"});
    addLog("产品新增","产品型号",nowUser.username,"新增产品："+name,old+"→"+JSON.stringify(db.product));
    saveData();refreshAll();resetProduct();alert("新增成功");
}
function resetProduct(){document.getElementById("proName").value="";document.getElementById("proRemark").value="";}
function editPro(id){let p=db.product.find(x=>x.id==id);alert("编辑功能弹窗已打开："+p.name);}
function stopPro(id){
    let old = JSON.stringify(db.product);
    db.product.find(x=>x.id==id).status="停用";
    addLog("产品停用","产品型号",nowUser.username,"停用产品ID："+id,old+"→"+JSON.stringify(db.product));
    saveData();refreshAll();
}

// ====================== 工厂客户 ======================
function renderCus(){
    let h="";
    db.factory.forEach(item=>{
        h+=`<tr>
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${item.type}</td>
            <td>${item.tel}</td>
            <td>${item.status}</td>
            <td>${nowUser.username}</td>
            <td>${getNowTime()}</td>
            <td><button class="btn-primary" onclick="editCus(${item.id})">编辑</button><button class="btn-gray" onclick="stopCus(${item.id})">停用</button></td>
        </tr>`;
    });
    document.getElementById("cusTbody").innerHTML=h;
}
function addCus(){
    let name = document.getElementById("cusName").value.trim();
    let type = document.getElementById("cusType").value;
    let tel = document.getElementById("cusTel").value.trim();
    if(!name) return alert("请输入名称！");
    let old = JSON.stringify(db.factory);
    let id = Math.max(...db.factory.map(x=>x.id),0)+1;
    db.factory.push({id:id,name:name,type:type,tel:tel,status:"正常"});
    addLog("工厂新增","工厂客户",nowUser.username,"新增："+name,old+"→"+JSON.stringify(db.factory));
    saveData();refreshAll();
}
function editCus(id){let f=db.factory.find(x=>x.id==id);alert("编辑："+f.name);}
function stopCus(id){
    let old = JSON.stringify(db.factory);
    db.factory.find(x=>x.id==id).status="停用";
    addLog("工厂停用","工厂客户",nowUser.username,"停用ID："+id,old+"→"+JSON.stringify(db.factory));
    saveData();refreshAll();
}

// ====================== 下拉框赋值 ======================
function appendProSelect(){
    let html="";
    db.product.filter(x=>x.status=="正常").forEach(item=>{
        html+=`<option value="${item.id}">${item.name}</option>`;
    });
    document.getElementById("inPro").innerHTML = html;
}
function appendFacSelect(){
    let html="";
    db.factory.filter(x=>x.type!="B端客户"&&x.status=="正常").forEach(item=>{
        html+=`<option value="${item.id}">${item.name}</option>`;
    });
    document.getElementById("inFac").innerHTML = html;
}
function appendCusSelect(){
    let html="";
    db.factory.filter(x=>x.type=="B端客户"&&x.status=="正常").forEach(item=>{
        html+=`<option value="${item.id}">${item.name}</option>`;
    });
    document.getElementById("outCus").innerHTML = html;
}

// ====================== 入库模块 ======================
function renderIn(){
    let h="";
    db.instock.reverse().forEach(item=>{
        let sndata=db.sn.find(x=>x.sn==item.sn);
        let p=db.product.find(x=>x.id==item.proId)?.name;
        let f=db.factory.find(x=>x.id==item.facId)?.name;
        h+=`<tr>
            <td>${item.sn}</td>
            <td>${p}</td>
            <td>${f}</td>
            <td>${item.batch}</td>
            <td>${item.inTime}</td>
            <td>${item.user}</td>
            <td class="status-in">在库</td>
            <td></td>
        </tr>`;
    });
    document.getElementById("inTbody").innerHTML=h;
}
function singleInStock(){
    let sn = document.getElementById("inSn").value.trim();
    let proId = document.getElementById("inPro").value;
    let facId = document.getElementById("inFac").value;
    let batch = document.getElementById("inBatch").value.trim();
    if(!sn||!batch) return alert("SN码和批次不能为空！");
    if(!checkSnFormat(sn)) return alert("SN格式错误！必须12位、SN开头");
    let hasSn = db.sn.find(x=>x.sn==sn);
    if(hasSn) return alert("该SN码已存在，禁止重复入库！");
    let old = JSON.stringify(db.sn);
    let nowTime = getNowTime();
    db.sn.push({
        id:Date.now(),sn:sn,proId:proId,facId:facId,batch:batch,
        status:"在库",inTime:nowTime,outTime:"",cusId:"",errReason:""
    });
    db.instock.push({
        id:Date.now(),sn:sn,proId:proId,facId:facId,batch:batch,inTime:nowTime,user:nowUser.username
    });
    addLog("单个入库","SN入库",nowUser.username,"入库SN："+sn,old+"→"+JSON.stringify(db.sn));
    autoSaveBackup();saveData();refreshAll();
    document.getElementById("inSn").value="";document.getElementById("inBatch").value="";
    alert("入库成功");
}
function batchExcelInStock(){
    let file = document.getElementById("excelFile").files[0];
    if(!file) return alert("请选择CSV/TXT文件！");
    failSnList = [];
    let reader = new FileReader();
    reader.readAsText(file);
    reader.onload=function(e){
        let text = e.target.result;
        let rows = text.split("\n");
        let successNum = 0;
        for(let i=0;i<rows.length;i++){
            let row = rows[i].trim();
            if(!row) continue;
            let arr = row.split(",");
            let sn = arr[0]?.trim();
            let proName = arr[1]?.trim();
            let batch = arr[2]?.trim();
            let facId = arr[3]?.trim();
            if(!sn||!proName||!batch||!facId){
                failSnList.push("行"+(i+1)+"：字段缺失");continue;
            }
            if(!checkSnFormat(sn)){
                failSnList.push("行"+(i+1)+"：SN格式错误");continue;
            }
            if(db.sn.find(x=>x.sn==sn)){
                failSnList.push("行"+(i+1)+"：SN重复");continue;
            }
            let pro = db.product.find(x=>x.name==proName);
            let fac = db.factory.find(x=>x.id==facId);
            if(!pro||!fac){
                failSnList.push("行"+(i+1)+"：型号/工厂不存在");continue;
            }
            let nowTime = getNowTime();
            db.sn.push({
                id:Date.now()+i,sn:sn,proId:pro.id,facId:fac.id,batch:batch,
                status:"在库",inTime:nowTime,outTime:"",cusId:"",errReason:""
            });
            db.instock.push({
                id:Date.now()+i,sn:sn,proId:pro.id,facId:fac.id,batch:batch,inTime:nowTime,user:nowUser.username
            });
            successNum++;
        }
        addLog("批量导入","SN批量入库",nowUser.username,"批量导入成功"+successNum+"条","批量新增SN数据");
        autoSaveBackup();saveData();refreshAll();
        if(failSnList.length>0){
            document.getElementById("failListText").innerText = failSnList.join("\n");
            document.getElementById("failModal").style.display="flex";
            document.getElementById("downloadFailBtn").style.display="block";
        }else{
            alert("全部导入成功，共"+successNum+"条");
        }
    }
}
function downloadFailList(){
    let text = failSnList.join("\n");
    let blob = new Blob([text],{type:"text/plain"});
    let a = document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="导入失败清单.txt";
    a.click();
}
function closeFailModal(){
    document.getElementById("failModal").style.display="none";
}

// ====================== 出库发货模块 ======================
function renderOut(){
    let h="";
    db.outstock.reverse().forEach(item=>{
        let cus = db.factory.find(x=>x.id==item.cusId)?.name;
        h+=`<tr>
            <td>${item.orderId}</td>
            <td>${item.sn}</td>
            <td>${cus}</td>
            <td>${item.outTime}</td>
            <td>${item.user}</td>
            <td>${item.remark}</td>
            <td class="status-out">已发货</td>
        </tr>`;
    });
    document.getElementById("outTbody").innerHTML=h;
}
function singleOutStock(){
    let sn = document.getElementById("outSn").value.trim();
    let cusId = document.getElementById("outCus").value;
    let remark = document.getElementById("outRemark").value.trim();
    if(!sn) return alert("请输入SN码");
    let sndata = db.sn.find(x=>x.sn==sn);
    if(!sndata) return alert("无此SN码记录");
    if(sndata.status !== "在库") return alert("禁止发货！当前状态："+sndata.status);
    let old = JSON.stringify(db.sn);
    let orderId = "OD"+Date.now();
    let nowTime = getNowTime();
    sndata.status = "已发货";
    sndata.outTime = nowTime;
    sndata.cusId = cusId;
    db.outstock.push({
        id:Date.now(),orderId:orderId,sn:sn,cusId:cusId,outTime:nowTime,user:nowUser.username,remark:remark
    });
    addLog("单个发货","产品出库",nowUser.username,"发货SN："+sn+"，单号："+orderId,old+"→"+JSON.stringify(db.sn));
    autoSaveBackup();saveData();refreshAll();
    document.getElementById("outSn").value="";document.getElementById("outRemark").value="";
    alert("发货成功，单号："+orderId);
}
function batchOutStock(){
    let text = document.getElementById("batchOutText").value.trim();
    let cusId = document.getElementById("outCus").value;
    if(!text) return alert("请输入批量SN码");
    let snList = text.split("\n").filter(x=>x.trim()!="");
    let success = 0,fail=0,failText="";
    let old = JSON.stringify(db.sn);
    let nowTime = getNowTime();
    let orderId = "OD"+Date.now();
    for(let sn of snList){
        sn = sn.trim();
        let sndata = db.sn.find(x=>x.sn==sn);
        if(!sndata){fail++;failText+=sn+"：无数据\n";continue;}
        if(sndata.status !== "在库"){fail++;failText+=sn+"：状态不可发货("+sndata.status+")\n";continue;}
        sndata.status="已发货";
        sndata.outTime=nowTime;
        sndata.cusId=cusId;
        db.outstock.push({id:Date.now()+Math.random(),orderId:orderId,sn:sn,cusId:cusId,outTime:nowTime,user:nowUser.username,remark:"批量发货"});
        success++;
    }
    addLog("批量发货","批量出库",nowUser.username,"批量发货成功"+success+"条",old+"→"+JSON.stringify(db.sn));
    autoSaveBackup();saveData();refreshAll();
    document.getElementById("batchOutText").value="";
    alert("批量处理完成：成功"+success+"条，失败"+fail+"条\n"+failText);
}
function searchOrder(){
    let key = document.getElementById("searchOrder").value.trim();
    if(!key) return alert("请输入发货单号");
    let list = db.outstock.filter(x=>x.orderId.includes(key));
    let h="";
    list.forEach(item=>{
        let cus = db.factory.find(x=>x.id==item.cusId)?.name;
        h+=`<tr>
            <td>${item.orderId}</td>
            <td>${item.sn}</td>
            <td>${cus}</td>
            <td>${item.outTime}</td>
            <td>${item.user}</td>
            <td>${item.remark}</td>
            <td class="status-out">已发货</td>
        </tr>`;
    });
    document.getElementById("outTbody").innerHTML=h||"<tr><td colspan=7>无单据数据</td></tr>";
}

// ====================== 异常作废模块 ======================
function renderErr(){
    let h="";
    db.error.reverse().forEach(item=>{
        h+=`<tr>
            <td>${item.id}</td>
            <td>${item.sn}</td>
            <td>${item.type}</td>
            <td>${item.reason}</td>
            <td>${item.user}</td>
            <td>${item.time}</td>
            <td></td>
        </tr>`;
    });
    document.getElementById("errTbody").innerHTML=h;
}
function addErr(){
    let sn = document.getElementById("errSn").value.trim();
    let type = document.getElementById("errType").value;
    let reason = document.getElementById("errReason").value.trim();
    if(!sn||!reason) return alert("SN码和原因不能为空！");
    let sndata = db.sn.find(x=>x.sn==sn);
    if(!sndata) return alert("无此SN码");
    let oldStatus = sndata.status;
    if(type=="标记异常"){
        if(!checkSnStatusChange(oldStatus,"异常")) return alert("当前状态不可标记异常！");
        sndata.status = "异常";
    }else{
        if(!checkSnStatusChange(oldStatus,"作废")) return alert("当前状态不可作废！");
        sndata.status = "作废";
    }
    let old = JSON.stringify(db.sn);
    let nowTime = getNowTime();
    db.error.push({id:Date.now(),sn:sn,type:type,reason:reason,user:nowUser.username,time:nowTime});
    sndata.errReason = reason;
    addLog("异常处理","SN异常/作废",nowUser.username,"SN："+sn+"，操作："+type,old+"→"+JSON.stringify(db.sn));
    autoSaveBackup();saveData();refreshAll();
    document.getElementById("errSn").value="";document.getElementById("errReason").value="";
    alert("提交成功");
}

// ====================== SN追溯查询 ======================
function traceSnInfo(){
    let sn = document.getElementById("traceSn").value.trim();
    let status = document.getElementById("traceStatus").value;
    let fac = document.getElementById("traceFac").value;
    let batch = document.getElementById("traceBatch").value;
    let list = [...db.sn];
    if(sn) list = list.filter(x=>x.sn.includes(sn));
    if(status) list = list.filter(x=>x.status==status);
    if(fac) list = list.filter(x=>db.factory.find(f=>f.id==x.facId)?.name.includes(fac));
    if(batch) list = list.filter(x=>x.batch.includes(batch));
    let html = "";
    let traceText = "";
    if(sn&&list.length==1){
        let d = list[0];
        let p = db.product.find(x=>x.id==d.proId)?.name;
        let f = db.factory.find(x=>x.id==d.facId)?.name;
        let cus = db.factory.find(x=>x.id==d.cusId)?.name||"无";
        let err = d.errReason||"无";
        traceText = `====== SN全生命周期追溯 ======
SN码：${d.sn}
产品型号：${p}
归属工厂：${f}
生产批次：${d.batch}
当前状态：${d.status}
入库时间：${d.inTime||"未入库"}
发货时间：${d.outTime||"未发货"}
收货客户：${cus}
异常备注：${err}
`;
    }else{
        traceText = "筛选查询，共"+list.length+"条数据";
    }
    list.forEach(item=>{
        let p = db.product.find(x=>x.id==item.proId)?.name;
        let f = db.factory.find(x=>x.id==item.facId)?.name;
        let cus = db.factory.find(x=>x.id==item.cusId)?.name||"无";
        let time = item.outTime||item.inTime;
        html += `<tr><td>${item.sn}</td><td>${p}</td><td>${f}</td><td>${item.batch}</td><td>${item.status}</td><td>${cus}</td><td>${time}</td></tr>`;
    });
    document.getElementById("traceInfo").innerText = traceText;
    document.getElementById("traceTbody").innerHTML = html;
}

// ====================== 用户权限 ======================
function renderUser(){
    let h="";
    db.user.forEach(item=>{
        h+=`<tr>
            <td>${item.id}</td>
            <td>${item.username}</td>
            <td>${item.role}</td>
            <td>${item.status}</td>
            <td>${nowUser.username}</td>
            <td>${getNowTime()}</td>
            <td><button class="btn-danger" onclick="delUser(${item.id})">删除账号</button></td>
        </tr>`;
    });
    document.getElementById("userTbody").innerHTML=h;
}
function addUser(){
    let name = document.getElementById("userName").value.trim();
    let pwd = document.getElementById("userPwd").value.trim();
    let role = document.getElementById("userRole").value;
    if(!name||!pwd) return alert("账号密码不能为空");
    if(db.user.find(x=>x.username==name)) return alert("账号已存在");
    let old = JSON.stringify(db.user);
    let id = Math.max(...db.user.map(x=>x.id),0)+1;
    db.user.push({id:id,username:name,pwd:pwd,role:role,status:"正常"});
    addLog("账号新增","用户账号",nowUser.username,"新增账号："+name,old+"→"+JSON.stringify(db.user));
    saveData();refreshAll();
    alert("账号新增成功");
}
function delUser(id){
    if(!confirm("确定删除该账号？删除不可恢复")) return;
    let old = JSON.stringify(db.user);
    db.user = db.user.filter(x=>x.id!=id);
    addLog("账号删除","用户账号",nowUser.username,"删除账号ID："+id,old+"→"+JSON.stringify(db.user));
    saveData();refreshAll();
}

// ====================== 日志查询 ======================
function searchLog(){
    let key = document.getElementById("logSearch").value.trim();
    let list = key?db.log.filter(x=>x.desc.includes(key)||x.type.includes(key)):[...db.log];
    renderLog(list);
}
function renderLog(list=db.log){
    let h="";
    list.forEach(item=>{
        h+=`<tr>
            <td>${item.user}</td>
            <td>${item.type}</td>
            <td>${item.obj}</td>
            <td>${item.change}</td>
            <td>${item.time}</td>
            <td><button class="btn-danger" onclick="delLog(${item.id})">删除</button></td>
        </tr>`;
    });
    document.getElementById("logTbody").innerHTML=h;
}
function delLog(id){
    if(!confirm("确定删除这条日志？"))return;
    db.log = db.log.filter(x=>x.id!=id);
    saveData();renderLog();
}

// ====================== 导出全部Excel ======================
function exportExcel(title,header,data){
    let str = header.join(",")+"\n";
    data.forEach(row=>{
        str += row.join(",")+"\n";
    });
    let blob = new Blob(["\uFEFF"+str],{type:"text/csv;charset=utf-8"});
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = title+"_"+getNowTime().slice(0,10)+".csv";
    a.click();
}
// 导出库存表
function exportStockTable(){
    let list = db.sn;
    let arr = [];
    list.forEach(d=>{
        let p = db.product.find(x=>x.id==d.proId)?.name;
        let f = db.factory.find(x=>x.id==d.facId)?.name;
        let cus = db.factory.find(x=>x.id==d.cusId)?.name||"无";
        arr.push([d.sn,p,f,d.batch,d.status,d.inTime||"",d.outTime||"",cus,d.errReason||""]);
    });
    exportExcel("库存总表",["SN码","产品型号","工厂","批次","状态","入库时间","发货时间","客户","异常备注"],arr);
}
// 导出发货记录
function exportOutStock(){
    let arr = [];
    db.outstock.forEach(d=>{
        let cus = db.factory.find(x=>x.id==d.cusId)?.name;
        arr.push([d.orderId,d.sn,cus,d.outTime,d.user,d.remark]);
    });
    exportExcel("发货记录表",["发货单号","SN码","收货客户","发货时间","操作人","备注"],arr);
}
// 导出筛选SN
function exportAllSn(){
    traceSnInfo();
    let tbody = document.getElementById("traceTbody").innerHTML;
    let tempArr = [];
    document.querySelectorAll("#traceTbody tr").forEach(tr=>{
        let td = tr.querySelectorAll("td");
        let row = [];
        td.forEach(t=>row.push(t.innerText));
        tempArr.push(row);
    });
    exportExcel("SN筛选导出表",["SN码","产品型号","工厂","批次","状态","流向客户","最新时间"],tempArr);
}
// 导出日志
function exportLog(){
    let arr = [];
    db.log.forEach(d=>{
        arr.push([d.user,d.type,d.obj,d.desc,d.change,d.time]);
    });
    exportExcel("操作审计日志",["操作人","操作类型","操作对象","操作描述","变更详情","操作时间"],arr);
}

// ====================== 备份+修改密码 ======================
function autoBackup(){
    autoSaveBackup();
    alert("手动备份成功！已保存当前全部数据");
}
function editPwd(){
    let oldPwd = prompt("请输入原密码");
    if(oldPwd !== nowUser.pwd) return alert("原密码错误");
    let newPwd = prompt("请输入新密码");
    if(!newPwd||newPwd.length<3) return alert("密码过短");
    let u = db.user.find(x=>x.id==nowUser.id);
    let old = u.pwd;
    u.pwd = newPwd;
    nowUser.pwd = newPwd;
    addLog("密码修改","账号密码",nowUser.username,"修改登录密码",old+"→"+newPwd);
    saveData();
    alert("密码修改成功，请重新登录生效");
}

// ====================== 页面加载初始化 ======================
window.onload = function(){
    loadData();
}