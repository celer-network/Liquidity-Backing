(window.webpackJsonp=window.webpackJsonp||[]).push([[6],{691:function(e,t,a){"use strict";a.d(t,"c",function(){return o}),a.d(t,"a",function(){return l}),a.d(t,"b",function(){return c});var n=a(689),r=a.n(n),i=a(331),u=a.n(i),o=(a(119),function(e,t){var a=r.a.find(e,function(e){return e.address===t});return a?a.symbol:""}),l=function(e,t){return r.a.toNumber(e)<1e5?"".concat(e," wei"):"".concat(u.a.utils.fromWei(e)," ").concat(t)},c=function(e){return r.a.toNumber(e)<1e5?"".concat(e," wei"):"".concat(u.a.utils.fromWei(e)," ether")}},695:function(e,t,a){"use strict";a.d(t,"d",function(){return n}),a.d(t,"b",function(){return r}),a.d(t,"c",function(){return i}),a.d(t,"a",function(){return u}),a.d(t,"e",function(){return o});var n={formatter:function(e){return e?"".concat(e,"ether"):""},parser:function(e){return e.replace(/[a-z]/g,"")}},r=function(e){return{formatter:function(t){return t?"".concat(t).concat(e):""},parser:function(e){return e.replace(/[A-Z]/g,"")}}},i={formatter:function(e){return e?"".concat(e,"day"):""},parser:function(e){return e.replace(/[a-z]/g,"")}},u={formatter:function(e){return e?"".concat(e,"block"):""},parser:function(e){return e.replace(/[a-z]/g,"")}},o=function(e){return{validator:function(t,a,n){a<e&&n("value is smaller than ".concat(e));n()}}}},696:function(e,t,a){"use strict";var n=a(194),r=a(195),i=a(197),u=a(196),o=a(198),l=a(1),c=a.n(l),s=a(689),d=a.n(s),f=a(865),m=a(864),b=a(866),p=a(868),v=a(111),h=a(47),g=a(703),O=a(744),j=O.a.Option,k=function(e){function t(){var e,a;Object(n.a)(this,t);for(var r=arguments.length,o=new Array(r),l=0;l<r;l++)o[l]=arguments[l];return(a=Object(i.a)(this,(e=Object(u.a)(t)).call.apply(e,[this].concat(o)))).defaultProps={allowClear:!0,disabled:!1,optionFilterProp:"children",placeholder:""},a.state={value:void 0},a.onChange=function(e){return a.setState({value:e})},a.getValue=function(){var e=a.props.defaultValue;return a.state.value||e},a.renderOptions=function(){var e=a.props.options;return d.a.map(e,function(e){var t=Object(g.a)(e,2),a=t[0],n=t[1];return c.a.createElement(j,{key:a,value:a},n)})},a}return Object(o.a)(t,e),Object(r.a)(t,[{key:"render",value:function(){var e=this.props.defaultValue,t=Object(h.a)({},d.a.omit(this.props,["options","defaultValue"]));return t.onChange||(t.onChange=this.onChange),d.a.isNil(e)||(t.defaultValue=e),c.a.createElement(O.a,Object.assign({},t,{showSearch:!0}),this.renderOptions())}}]),t}(c.a.Component),E=f.a.Item,C={wrapperCol:{sm:{span:3,offset:21},xs:{span:24}}},y={date:m.a,input:b.a,number:p.a,text:b.a.TextArea,select:k},V=function(e){function t(){var e,a;Object(n.a)(this,t);for(var r=arguments.length,o=new Array(r),l=0;l<r;l++)o[l]=arguments[l];return(a=Object(i.a)(this,(e=Object(u.a)(t)).call.apply(e,[this].concat(o)))).handleSubmit=function(e){var t=a.props,n=t.form,r=t.onSubmit;e.preventDefault(),n.validateFields(function(e,t){e||r(t)})},a.renderFormItems=function(){var e=a.props,t=e.form,n=e.formItemLayout,r=e.items,i=t.getFieldDecorator;return d.a.map(r,function(e){var t=e.field,a=void 0===t?"input":t,r=e.fieldOptions,u=e.initialValue,o=e.label,l=e.name,s=e.rules,f=y[a],m={initialValue:u,rules:s,getValueFromEvent:function(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];if("file"===a)return t[0].fileList;var r=t[0];if(!r||!r.target)return r;var i=r.target;return"checkbox"===i.type?i.checked:i.value}};return c.a.createElement(E,Object.assign({key:l},n,{label:o||d.a.capitalize(l)}),i(l,m)(c.a.createElement(f,r)))})},a}return Object(o.a)(t,e),Object(r.a)(t,[{key:"render",value:function(){var e=this.props,t=e.onSubmit,a=e.submitText;return c.a.createElement(f.a,{onSubmit:this.handleSubmit},this.renderFormItems(),t!==d.a.noop&&c.a.createElement(E,C,c.a.createElement(v.a,{htmlType:"submit",type:"primary"},a)))}}]),t}(c.a.Component);V.defaultProps={formItemLayout:{labelCol:{sm:{span:8},xs:{span:24}},wrapperCol:{sm:{span:16},xs:{span:24}}},onSubmit:d.a.noop,submitText:"Save"};t.a=f.a.create({onValuesChange:function(e,t){e.onValuesChange&&e.onValuesChange(t)}})(V)},717:function(e,t,a){"use strict";a.d(t,"a",function(){return i}),a.d(t,"g",function(){return u}),a.d(t,"c",function(){return o}),a.d(t,"b",function(){return l}),a.d(t,"e",function(){return c}),a.d(t,"f",function(){return s}),a.d(t,"d",function(){return d}),a.d(t,"h",function(){return f}),a.d(t,"i",function(){return b});var n=a(689),r=a.n(n),i="Bid",u="Reveal",o="Claim",l="Challenge",c="Finalize",s="Finalized",d="Expired",f=function(e,t,a){var n=r.a.get(e,"block.number"),f=r.a.find(a,function(e){return e.args[0]===t.args[0]}),m=r.a.get(f,"value",{}),b=m.bidEnd,p=m.revealEnd,v=m.claimEnd,h=m.challengeEnd,g=m.finalizeEnd,O=m.finalized;return n<r.a.toNumber(b)?i:n<r.a.toNumber(p)?u:n<r.a.toNumber(v)?o:n<r.a.toNumber(h)?l:n<r.a.toNumber(g)?c:O?s:d},m=function(e,t){var a=e.value,n=a.rate1,r=a.celerValue1,i=t.value,u=i.rate2,o=i.celerValue2;return n!==u?n-u:o-r},b=function(e,t){var a=[],n=e.value.value;return t.sort(m),r.a.forEach(t,function(e){var t=e.args[0],r=e.value.value;if(n-=r,a.push(t),n<0)return!1}),a}},874:function(e,t,a){"use strict";a.r(t);var n=a(47),r=a(194),i=a(195),u=a(197),o=a(196),l=a(198),c=a(1),s=a.n(c),d=a(0),f=a.n(d),m=a(689),b=a.n(m),p=a(91),v=a(34),h=a(873),g=a(686),O=a(18),j=a(90),k=a(41),E=a(869),C=a(111),y=a(331),V=a.n(y),A=a(681),w=a(696),z=a(695),D=a(691),S=function(e){function t(e,a){var n;return Object(r.a)(this,t),(n=Object(u.a)(this,Object(o.a)(t).call(this,e))).handleValueChange=function(e){return n.setState(e)},n.handleInitAuction=function(){var e=n.props.onClose;n.form.current.validateFields(function(t,a){if(!t){var r=a.token,i=a.bidDuration,u=a.revealDuration,o=a.claimDuration,l=a.challengeDuration,c=a.finalizeDuration,s=a.value,d=a.duration,f=a.maxRate,m=a.minValue,b=a.collateralAddress,p=a.collateralValue,v=void 0===p?0:p;n.contracts.LiBA.methods.initAuction.cacheSend(r,i,u,o,l,c,V.a.utils.toWei(s.toString(),"ether"),d,f,V.a.utils.toWei(m.toString(),"ether"),b,V.a.utils.toWei(v.toString(),"ether")),e()}})},n.state={},n.form=s.a.createRef(),n.contracts=a.drizzle.contracts,n}return Object(l.a)(t,e),Object(i.a)(t,[{key:"render",value:function(){var e=this.props,t=e.visible,a=e.network,n=e.onClose,r=[{name:"token",field:"select",fieldOptions:{options:a.supportedTokens.map(function(e){return[e.address,"".concat(e.symbol," (").concat(e.address,")")]})},rules:[{message:"Please select a token!",required:!0}]},{name:"value",field:"number",fieldOptions:Object(z.b)(Object(D.c)(a.supportedTokens,this.state.token)),rules:[Object(z.e)(0),{message:"Please enter a value!",required:!0}]},{name:"maxRate",label:"Max Rate",field:"number",rules:[Object(z.e)(0),{message:"Please enter a max rate!",required:!0}]},{name:"minValue",label:"Min Value",field:"number",fieldOptions:Object(z.b)(Object(D.c)(a.supportedTokens,this.state.token)),rules:[Object(z.e)(0),{message:"Please enter a min value!",required:!0}]},{name:"duration",field:"number",fieldOptions:z.a,rules:[Object(z.e)(0),{message:"Please enter a duration!",required:!0}]},{name:"collateralAddress",label:"Collateral Address"},{name:"collateralValue",label:"Collateral Value",field:"number",rules:[Object(z.e)(0)]},{name:"bidDuration",label:"Bid Duration",field:"number",fieldOptions:z.a,rules:[Object(z.e)(0),{message:"Please enter a duration!",required:!0}]},{name:"revealDuration",label:"Reveal Duration",field:"number",fieldOptions:z.a,rules:[Object(z.e)(0),{message:"Please enter a duration!",required:!0}]},{name:"claimDuration",label:"Claim Duration",field:"number",fieldOptions:z.a,rules:[Object(z.e)(0),{message:"Please enter a duration!",required:!0}]},{name:"challengeDuration",label:"Challenge Duration",field:"number",fieldOptions:z.a,rules:[Object(z.e)(0),{message:"Please enter a duration!",required:!0}]},{name:"finalizeDuration",label:"Finalize Duration",field:"number",fieldOptions:z.a,rules:[Object(z.e)(0),{message:"Please enter a duration!",required:!0}]}];return s.a.createElement(A.a,{title:"Launch Auction",visible:t,onOk:this.handleInitAuction,onCancel:n},s.a.createElement(w.a,{ref:this.form,items:r,onValuesChange:this.handleValueChange}))}}]),t}(s.a.Component);S.contextTypes={drizzle:f.a.object};var x=S,P=a(717),L=[{key:"all",tab:"All"},{key:"own",tab:"Own"},{key:"bid",tab:"Bid"}],T=function(e){function t(e,a){var n;return Object(r.a)(this,t),(n=Object(u.a)(this,Object(o.a)(t).call(this,e))).onTabChange=function(e){n.setState({tab:e})},n.toggleModal=function(){n.setState(function(e){return{isModalVisible:!e.isModalVisible}})},n.renderAuction=function(e){var t=n.props.network,a=e.value,r=a.asker,i=a.value,u=a.duration,o=n.props.LiBA;return s.a.createElement(h.a.Item,null,s.a.createElement(g.a,{actions:[s.a.createElement(v.Link,{to:"/auction/".concat(e.args[0])},s.a.createElement(O.a,{type:"eye",title:"View Detail"}))]},s.a.createElement(j.a,null,s.a.createElement(k.a,{span:12},s.a.createElement(E.a,{title:"Asker",value:r})),s.a.createElement(k.a,{span:12},s.a.createElement(E.a,{title:"Period",value:Object(P.h)(t,e,o.getAuctionPeriod)})),s.a.createElement(k.a,{span:12},s.a.createElement(E.a,{title:"Value",value:Object(D.b)(i)})),s.a.createElement(k.a,{span:12},s.a.createElement(E.a,{title:"Duration",value:"".concat(u," Days")})))))},n.renderAuctions=function(){var e=n.props,t=e.accounts,a=e.LiBA,r=n.state.tab,i=b.a.values(a.getAuction);return"own"===r&&(i=b.a.filter(i,function(e){return e.value.asker===t[0]})),"bid"===r&&(i=b.a.filter(i,function(e){return b.a.includes(a.bids,e.args[0])})),s.a.createElement(h.a,{grid:{gutter:16,column:3},dataSource:i,renderItem:n.renderAuction})},n.state={isModalVisible:!1,tab:"all"},n.contracts=a.drizzle.contracts,n}return Object(l.a)(t,e),Object(i.a)(t,[{key:"render",value:function(){var e=this.state,t=e.isModalVisible,a=e.tab,n=this.props.network;return s.a.createElement(g.a,{tabList:L,title:"LiBA",activeTabKey:a,onTabChange:this.onTabChange,extra:s.a.createElement(C.a,{type:"primary",onClick:this.toggleModal},"Launch auction")},this.renderAuctions(),s.a.createElement(x,{network:n,visible:t,onClose:this.toggleModal}))}}]),t}(s.a.Component);T.contextTypes={drizzle:f.a.object};t.default=Object(p.drizzleConnect)(T,function(e){var t=e.contracts,a=e.accounts,r=e.LiBA;return{accounts:a,network:e.network,LiBA:Object(n.a)({},r,t.LiBA)}})}}]);
//# sourceMappingURL=6.35ef47ce.chunk.js.map