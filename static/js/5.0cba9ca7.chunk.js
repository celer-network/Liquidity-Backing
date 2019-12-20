(this["webpackJsonptruffle-react-redux-dapp"]=this["webpackJsonptruffle-react-redux-dapp"]||[]).push([[5],{1039:function(e,t,a){"use strict";a.r(t);var n=a(40),r=a(80),i=a(81),l=a(83),c=a(82),o=a(84),s=a(0),u=a.n(s),d=a(1),m=a.n(d),f=a(30),b=a.n(f),p=a(92),v=a(1038),h=a(1035),g=a(77),O=a(1040),E=a(127),j=a(62),k=a(978),A=a(267),y=a(1042),B=a(992),C=a(1036),V=a(1041),w=a(979),S=a(1037),z=a(271),L=[{title:"Bidder",dataIndex:"bidder"},{title:"Rate",dataIndex:"rate"},{title:"Value",dataIndex:"value"},{title:"Celer value",dataIndex:"celerValue"}],I=function(e){function t(){return Object(r.a)(this,t),Object(l.a)(this,Object(c.a)(t).apply(this,arguments))}return Object(o.a)(t,e),Object(i.a)(t,[{key:"render",value:function(){var e=this.props,t=e.auction,a=e.bids,r=e.network,i=Object(z.c)(r.supportedTokens,t.value.tokenAddress),l=b.a.filter(a).map((function(e){var t=e.args[0];return Object(n.a)({},e.value,{bidder:t,value:Object(z.b)(e.value.value,i),celerValue:Object(z.a)(e.value.celerValue)})}));return u.a.createElement(S.a,{dataSource:l,columns:L,pagination:!1})}}]),t}(u.a.Component);var P=Object(p.drizzleConnect)(I,(function(e){})),R=a(131),T=a.n(R),M=a(972),W=a(273),x=a(272),D=a(980),N=function(e){function t(e,a){var n;return Object(r.a)(this,t),(n=Object(l.a)(this,Object(c.a)(t).call(this,e))).onSubmit=function(){var e=n.props,t=e.auction,a=e.onClose;n.form.current.validateFields((function(e,r){if(!e){var i=r.celerValue,l=r.value,c=r.rate,o=r.passcode,s=t.args[0];n.contracts.LiBA.methods.placeBid.cacheSend(t.args[0],T.a.utils.soliditySha3(c*D.b,T.a.utils.toWei(l.toString(),"ether"),T.a.utils.toWei(i.toString(),"ether"),o),T.a.utils.toWei(i.toString(),"ether")),localStorage.setItem("auction-".concat(n.contracts.LiBA.address,"-").concat(s),JSON.stringify(r)),a()}}))},n.form=u.a.createRef(),n.contracts=a.drizzle.contracts,n}return Object(o.a)(t,e),Object(i.a)(t,[{key:"render",value:function(){var e=this.props,t=e.auction,a=e.network,r=e.visible,i=e.onClose,l=t.value,c=l.tokenAddress,o=l.maxRate,s=l.minValue,d=Object(z.c)(a.supportedTokens,c),m=[{name:"value",field:"number",fieldOptions:Object(n.a)({},Object(x.c)(d),{placeholder:"The amount of token to lend"}),rules:[Object(x.f)(Object(z.b)(s)),{message:"Please enter a value!",required:!0}]},{name:"rate",label:"Daily Rate",field:"number",fieldOptions:Object(n.a)({},x.g,{placeholder:"The daily lending interest rate",step:.1,precision:D.c}),rules:[Object(x.f)(0),Object(x.e)(o/D.b),{message:"Please enter a rate!",required:!0}]},{name:"celerValue",label:"CELR Value",field:"number",fieldOptions:Object(n.a)({},x.b,{placeholder:"The amount of celer token for bidding"}),rules:[Object(x.f)(a.minCELR),{message:"Please enter a celer value!",required:!0}]},{name:"passcode",field:"number",fieldOptions:{placeholder:"A random number used to hide your bid info"},rules:[Object(x.f)(1e4),{message:"Please enter a passcode!",required:!0}]}];return u.a.createElement(M.a,{title:"Bid Auction",visible:r,onOk:this.onSubmit,onCancel:i},u.a.createElement(B.a,{type:"warning",message:"Once the bid is placed, you have to reveal it, or you will lose staked CELR",showIcon:!0}),u.a.createElement(W.a,{ref:this.form,items:m}))}}]),t}(u.a.Component);N.contextTypes={drizzle:m.a.object};var q=N,F=function(e){function t(e,a){var n;return Object(r.a)(this,t),(n=Object(l.a)(this,Object(c.a)(t).call(this,e))).onSubmit=function(){var e=n.props,t=e.auction,a=e.onClose;n.form.current.validateFields((function(e,r){if(!e){var i=r.celerValue,l=r.value,c=r.rate,o=r.passcode,s=r.commitmentID;n.contracts.LiBA.methods.revealBid.cacheSend(t.args[0],c*D.b,T.a.utils.toWei(l.toString(),"ether"),T.a.utils.toWei(i.toString(),"ether"),o,parseInt(s)),a()}}))},n.form=u.a.createRef(),n.contracts=a.drizzle.contracts,n}return Object(o.a)(t,e),Object(i.a)(t,[{key:"render",value:function(){var e=this.props,t=e.auction,a=e.network,r=e.PoLC,i=e.visible,l=e.onClose,c=Object(z.c)(a.supportedTokens,t.value.tokenAddress),o=b()(r.commitmentsByUser).filter((function(e){return e.value.tokenAddress===t.value.tokenAddress})).map((function(e){var t=e.args[1];console.log(e);var a=Object(z.b)(e.value.availableValue,c);return[t,"ID: ".concat(t,", Available Value: ").concat(a)]})).value(),s=JSON.parse(localStorage.getItem("auction-".concat(this.contracts.LiBA.address,"-").concat(t.args[0]))||"{}"),d=[{name:"value",field:"number",initialValue:s.value,fieldOptions:Object(n.a)({},Object(x.c)(c),{placeholder:"The amount of token to lend"}),rules:[Object(x.f)(0),{message:"Please enter a value!",required:!0}]},{name:"rate",label:"Daily Rate",field:"number",initialValue:s.rate,fieldOptions:Object(n.a)({},x.g,{step:.1,precision:D.c,placeholder:"The daily lending interest rate"}),rules:[Object(x.f)(0),{message:"Please enter a rate!",required:!0}]},{name:"celerValue",label:"Celer Value",field:"number",initialValue:s.celerValue,fieldOptions:Object(n.a)({},x.b,{placeholder:"The amount of celer token for bidding"}),rules:[Object(x.f)(0),{message:"Please enter a celer value!",required:!0}]},{name:"passcode",field:"number",initialValue:s.passcode,fieldOptions:{placeholder:"The random number entered for bidding"},rules:[Object(x.f)(0),{message:"Please enter a passcode!",required:!0}]},{name:"commitmentID",field:"select",fieldOptions:{options:o,placeholder:"The commitment in PoLC used for lending"},rules:[{message:"Please enter a commitmentID!",required:!0}]}];return u.a.createElement(M.a,{title:"Reveal Auction",visible:i,onOk:this.onSubmit,onCancel:l},u.a.createElement(W.a,{ref:this.form,items:d}))}}]),t}(u.a.Component);F.contextTypes={drizzle:m.a.object};var J=Object(p.drizzleConnect)(F,(function(e){return{PoLC:e.contracts.PoLC}})),U=a(981),Y=v.a.Step,G=[U.b,U.h,U.d,U.c,U.f],H=function(e){function t(e,a){var n;Object(r.a)(this,t),(n=Object(l.a)(this,Object(c.a)(t).call(this,e))).takeAction=function(){switch(n.state.currentPeriod){case U.b:return n.toggleBidModal();case U.h:return n.toggleRevealModal();case U.d:return n.claimWinners();case U.c:return n.challengeWinners();case U.f:return n.finalizeAuction();default:console.error("invalid period")}},n.toggleBidModal=function(){n.setState((function(e){return{isBidModalVisible:!e.isBidModalVisible}}))},n.toggleRevealModal=function(){n.setState((function(e){return{isRevealModalVisible:!e.isRevealModalVisible}}))},n.claimWinners=function(){var e=n.state.auctionId,t=n.getWinners(),a=t.winners,r=t.topLoser;n.contracts.LiBA.methods.claimWinners(e,a,r).send()},n.challengeWinners=function(){var e=n.state,t=e.auctionId,a=e.winners,r=n.getWinners(),i=r.winners,l=r.topLoser;if(b.a.isEqual(a,i))h.a.error({message:"There is no need to challenge winners"});else{var c=b.a.difference(i,a)[0];n.contracts.LiBA.methods.challengeWinners(t,c,i,l).send()}},n.finalizeAuction=function(){var e=n.state.auctionId;n.contracts.LiBA.methods.finalizeAuction.cacheSend(e)},n.finalizeBid=function(){var e=n.state.auctionId;n.contracts.LiBA.methods.finalizeBid.cacheSend(e)},n.collectCollateral=function(){var e=n.state.auctionId;n.contracts.LiBA.methods.collectCollateral.cacheSend(e)},n.repayAuction=function(){var e,t=n.state,a=t.auctionId,r=t.auction,i=t.bids,l=t.winners,c=[a];r.value.tokenAddress===D.a&&c.push({value:Object(U.i)(i,l).toString()}),(e=n.contracts.LiBA.methods.repayAuction).cacheSend.apply(e,c)},n.getWinners=function(){var e=n.state,t=e.auction,a=e.bids;return Object(U.l)(t,a)},n.renderAction=function(){var e=n.props.accounts,t=n.state,a=t.auction,r=t.currentPeriod,i=t.currentStep,l=t.winners,c=e[0];if(c===a.value.asker){if(r===U.g)return[u.a.createElement(g.a,{block:!0,type:"primary",onClick:n.repayAuction},"Repay")];if(!b.a.includes([U.d,U.f],r))return[]}else{if(r===U.e||-1===i&&!b.a.includes(l,c))return[u.a.createElement(g.a,{block:!0,type:"primary",onClick:n.finalizeBid},"Withdraw bid")];if(r===U.g)return[u.a.createElement(g.a,{block:!0,type:"primary",onClick:n.collectCollateral},"Collect collateral")];if(!b.a.includes([U.b,U.h,U.c],r))return[]}return[u.a.createElement(g.a,{block:!0,type:"primary",onClick:n.takeAction},r)]},n.renderAuctionDetail=function(){var e,t=n.props.network,a=n.state,r=a.auction,i=a.bids,l=a.winners,c=r.value,o=c.asker,s=c.tokenAddress,d=c.collateralAddress,m=c.collateralValue,f=c.value,p=c.duration,v=c.maxRate,h=c.minValue,g=Object(z.c)(t.supportedTokens,s),B=JSON.parse(localStorage.getItem("auction-".concat(n.contracts.LiBA.address,"-").concat(r.args[0]))||"{}");return e=b.a.isEmpty(B)?u.a.createElement(O.a,{status:"warning",title:"You have not placed bid yet"}):u.a.createElement(E.a,null,u.a.createElement(j.a,{span:12},u.a.createElement(k.a,{title:"Value",value:"".concat(B.value,"  ").concat(g)})),u.a.createElement(j.a,{span:12},u.a.createElement(k.a,{title:"Daily Rate",value:"".concat(B.rate," %")}))," ",u.a.createElement(j.a,{span:12},u.a.createElement(k.a,{title:"Celer Value",value:"".concat(B.celerValue," CELR")}))," ",u.a.createElement(j.a,{span:12},u.a.createElement(k.a,{title:"Passcode",value:B.passcode}))),u.a.createElement(E.a,{style:{marginTop:"10px"}},u.a.createElement(j.a,{span:24},u.a.createElement(k.a,{title:"Asker",value:o})),u.a.createElement(j.a,{span:24},u.a.createElement(k.a,{title:"Token Address",value:s})),u.a.createElement(j.a,{span:12},u.a.createElement(k.a,{title:"Value",value:Object(z.b)(f,g)})),u.a.createElement(j.a,{span:12},u.a.createElement(k.a,{title:"Duration",value:"".concat(p," Day")})),u.a.createElement(j.a,{span:12},u.a.createElement(k.a,{title:"Min Value",value:Object(z.b)(h,g)})),u.a.createElement(j.a,{span:12},u.a.createElement(k.a,{title:"Max Daily Rate",value:"".concat(v/D.b," %")})),m>0&&u.a.createElement(u.a.Fragment,null,u.a.createElement(j.a,{span:12},u.a.createElement(k.a,{title:"Collateral Address",value:d})),u.a.createElement(j.a,{span:12},u.a.createElement(k.a,{title:"Collateral Value",value:m}))),u.a.createElement(j.a,{span:24},u.a.createElement(A.a,null,u.a.createElement(A.a.TabPane,{tab:"Your Bid",key:"own"},e),u.a.createElement(A.a.TabPane,{tab:"Bids",key:"bids"},u.a.createElement(P,{auction:r,bids:i,network:t})),u.a.createElement(A.a.TabPane,{tab:"Winners",key:"winners"},u.a.createElement(y.a,{size:"small",bordered:!0,dataSource:l,renderItem:function(e){return u.a.createElement(y.a.Item,null,e)}})))))},n.renderProgress=function(){var e=n.state,t=e.auctionPeriod,a=e.blockNumber,r=e.currentPeriod,i=e.currentStep;if(-1===i)return u.a.createElement(B.a,{type:"warning",message:r,showIcon:!0});var l=r.toLowerCase(),c=t.value[l+"End"]-a;return u.a.createElement(u.a.Fragment,null,u.a.createElement(v.a,{size:"small",current:i},b.a.map(G,(function(e){return u.a.createElement(Y,{key:e,title:e})}))),u.a.createElement(C.a,null,x.a.formatter(c)," left to ",l))},n.contracts=a.drizzle.contracts,n.state={auction:null,currentStep:0,currentPeriod:"",isBidModalVisible:!1,isRevealModalVisible:!1};var i=parseInt(e.match.params.id);return n.contracts.LiBA.events.RevealBid({fromBlock:0,filter:{auctionId:i}},(function(e,t){if(!e){var a=t.returnValues,r=a.auctionId,i=a.bidder;n.contracts.LiBA.methods.bidsByUser.cacheCall(i,r)}})),n.contracts.LiBA.events.ClaimWinners({fromBlock:0,filter:{auctionId:i}},(function(e,t){if(!e){var a=t.returnValues.winners;n.setState({winners:a})}})),n}return Object(o.a)(t,e),Object(i.a)(t,[{key:"render",value:function(){var e=this.props.network,t=this.state,a=t.auction,n=t.isBidModalVisible,r=t.isRevealModalVisible;return a?u.a.createElement(w.a,{title:"Auction",actions:this.renderAction()},this.renderProgress(),this.renderAuctionDetail(),u.a.createElement(q,{auction:a,network:e,visible:n,onClose:this.toggleBidModal}),u.a.createElement(J,{auction:a,network:e,visible:r,onClose:this.toggleRevealModal})):u.a.createElement(V.a,null)}}],[{key:"getDerivedStateFromProps",value:function(e){var t=e.match,a=e.LiBA,n=void 0===a?{}:a,r=e.network,i=b.a.values(n.getAuction),l=b.a.find(i,(function(e){return e.args[0]===t.params.id}));if(!l)return{};var c=Object(U.j)(n.getAuctionPeriod,l),o=b.a.get(r,"block.number"),s=Object(U.k)(c,o),u=b.a.indexOf(G,s),d=l.args[0],m=b.a.filter(n.bidsByUser,(function(e){return e.args[1]===d}));return{auction:l,auctionId:d,bids:m,auctionPeriod:c,blockNumber:o,currentPeriod:s,currentStep:u}}}]),t}(u.a.Component);H.contextTypes={drizzle:m.a.object};t.default=Object(p.drizzleConnect)(H,(function(e){var t=e.accounts,a=e.contracts,r=e.LiBA;return{accounts:t,network:e.network,LiBA:Object(n.a)({},r,{},a.LiBA)}}))},980:function(e,t,a){"use strict";a.d(t,"a",(function(){return n})),a.d(t,"c",(function(){return r})),a.d(t,"b",(function(){return i}));var n="0x0000000000000000000000000000000000000000",r=1,i=Math.pow(10,r)},981:function(e,t,a){"use strict";a.d(t,"b",(function(){return o})),a.d(t,"h",(function(){return s})),a.d(t,"d",(function(){return u})),a.d(t,"c",(function(){return d})),a.d(t,"f",(function(){return m})),a.d(t,"g",(function(){return f})),a.d(t,"e",(function(){return b})),a.d(t,"a",(function(){return p})),a.d(t,"j",(function(){return v})),a.d(t,"k",(function(){return h})),a.d(t,"l",(function(){return g})),a.d(t,"i",(function(){return O}));var n=a(275),r=a(30),i=a.n(r),l=a(131),c=a.n(l).a.utils.BN,o="Bid",s="Reveal",u="Claim",d="Challenge",m="Finalize",f="Finalized",b="Expired",p=[o,s,u,d,m,f,b],v=function(e,t){return i.a.find(e,(function(e){return e.args[0]===t.args[0]}))},h=function(e,t){var a=i.a.get(e,"value",{}),n=a.bidEnd,r=a.revealEnd,l=a.claimEnd,c=a.challengeEnd,p=a.finalizeEnd,v=a.finalized;return t<i.a.toNumber(n)?o:t<i.a.toNumber(r)?s:t<i.a.toNumber(l)?u:t<i.a.toNumber(c)?d:!v&&t<i.a.toNumber(p)?m:v?f:b},g=function(e,t){var a,r=[],l=e.value.value;return t.sort(E),i.a.forEach(t,(function(e){var t=Object(n.a)(e.args,1)[0],i=e.value.value;if(l<0)return a=t,!1;l-=i,r.push(t)})),a||(a=i.a.last(r)),{winners:r,topLoser:a}},O=function(e,t){var a=new c(0);return i.a.forEach(e,(function(e){var r=Object(n.a)(e.args,1)[0],l=e.value,o=l.value,s=l.rate;i.a.includes(t,r)&&(a=a.add(new c(o).muln(100+parseInt(s)).divn(100)))})),a},E=function(e,t){var a=e.value,n=a.rate1,r=a.celerValue1,i=t.value,l=i.rate2,c=i.celerValue2;return n!==l?n-l:c-r}}}]);
//# sourceMappingURL=5.0cba9ca7.chunk.js.map