(function(embedded25) {
	var URL_PREFIX = "https://gauss.unival.com/25power-dev/";

	var httpGet = function(url, callback) {
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function() {
			if(this.readyState === 4) { //DONE
				callback && callback(this);
			}
		};
		xhttp.open("GET", url, true);
		xhttp.send();
	};

	var addParam = function(url, name, value) {
		url += (
			value ?
				((url.indexOf("?") > -1 ? ("&" + name) : ("?" + name)) + "=" + value)
			: ""
		);
		return url;
	};

	var getItemType = function(itemTypeId){
        itemTypeId = parseInt(itemTypeId);
		//making compType default to events for now
		return (itemTypeId === 4) ? "location" : (itemTypeId === 6) ? "resource" : (itemTypeId === 2) ? "organization" : "event";
	};

	var undef = function(input) {
		return typeof input === "undefined";
	};

	var coalesce = function() {
		for(var arg in [].slice.call(arguments)) {
			if(!undef(arguments[arg])) {
				return arguments[arg];
			}
		}
	};

	var iFrameId = function(targetId) {
		return targetId + "IFrame";
	};

	var createIFrame = function(targetId, sourceUrl, internalScroll) {
		var elem = document.createElement("iframe");

		if (sourceUrl.indexOf("calendar") > -1 ) {
			var title = "Calendar";
		} else if (sourceUrl.indexOf("availability") > -1 || sourceUrl.indexOf("availability_daily") > -1) {
			var title = "Availability";
		} else if (sourceUrl.indexOf("express") > -1) {
			var title = "Express Scheduling";
		} else if (sourceUrl.indexOf("rose") > -1 ) {
			var title = "Event Form";
		} else {
			var title = "25Live Pro"
		}

		elem.setAttribute("id", iFrameId(targetId));
		elem.setAttribute("title", title);
		elem.setAttribute("scrolling", (internalScroll ? "yes" : "no"));
		elem.setAttribute("overflow", (internalScroll ? "auto" : "hidden"));
		elem.setAttribute("height", "100%");
		elem.setAttribute("width", "100%");
		elem.setAttribute("marginheight", "0");
		elem.setAttribute("marginwidth", "0");
		elem.setAttribute("frameborder", "0");
		elem.setAttribute("src", sourceUrl);
		return elem;
	};

	var attachIFrame = function(iFrame, targetId) {
		document.getElementById(targetId).appendChild(iFrame);
	};

	var getSourceUrl = function(url, comptype, instId, itemId, queryId, itemTypeId, sessionId, allowEventCreation, embeddedConfigToken) {
		url = URL_PREFIX + instId + url;
		var compSubject = itemTypeId && getItemType(itemTypeId);

		let searchQuery = "";
		if(queryId && isNaN(parseInt(queryId))) {
			searchQuery = queryId;
			queryId = null;
		}

		url = addParam(url, "comptype", comptype);
		url = addParam(url, "compsubject", compSubject);
		url = addParam(url, "itemTypeId", itemTypeId);
		url = addParam(url, "itemId", itemId);
		url = addParam(url, "queryId", queryId);
		url = addParam(url, "searchQuery", encodeURIComponent(searchQuery));
		url = addParam(url, "persistentSessionIdParam", sessionId);
		url = addParam(url, "allowEventCreation", (allowEventCreation ? "T" : null));
		url = addParam(url, "embeddedConfigToken", embeddedConfigToken);
		return url;
	};

	var setCookie = function(sessionId) {
		document.cookie = "WSSESSIONID=" + sessionId + ";path=/";
	};

	// let overlappingBottomElemHeight = 0;
	let adjustHeight = function (iFrameId, height) {
		// let elem = document.getElementById(iFrameId);
		// let rect = elem.getBoundingClientRect();
		//
		// if(!height) {
		// 	height = rect.height - overlappingBottomElemHeight;
		// }
		//
		// let bottomElem = document.elementFromPoint(rect.left, Math.min(rect.bottom, window.innerHeight) - 1);
		// if(elem && bottomElem && !elem.isSameNode(bottomElem)) { //if not the same elem then something is overlapping iFrame on bottom (eg, a footer)
		// 	overlappingBottomElemHeight = bottomElem.getBoundingClientRect().height; //get the height of the overlapping elem
		// } else if(bottomElem) { //if they are the same node, set back to 0
		// 	overlappingBottomElemHeight = 0;
		// }
		//
		// height += overlappingBottomElemHeight;
		//
		// if(height !== rect.height) {
		// 	window[iFrameId].style.height = parseInt(height) + "px";
		// }

		if(parseInt(height)) {
			window[iFrameId].style.height = parseInt(height) + "px";
		}
	};

	var registerHeightManager = function(iFrameId) {
		window.addEventListener("message", function(event) {
			try {
                if (event.source === (window[iFrameId].contentWindow)) {
                    var obj = JSON.parse(event.data);
                    if (obj.type === "height" && parseInt(obj.data)) {
						adjustHeight(iFrameId, obj.data);
                    }
                }
            } catch(e){}
		}, false);
	};

	var registerScrollToManager = function(iFrameId) {
        window.addEventListener("message", function(event) {
            try {
                if (event.source === (window[iFrameId].contentWindow)) {
                    var obj = JSON.parse(event.data);
                    if(obj.type === "scrollTo" && parseInt(obj.data)) {
						var iFrameOffsetTop = document.getElementById(iFrameId).offsetTop;
						window.scrollTo(0, parseInt(obj.data) + iFrameOffsetTop);
                    }
                }
            } catch(e){}
        }, false);

		let scrollWiggleRoom = 50;
		let overlappingElemHeight = 0;
		window.addEventListener("scroll", function() {
			let elem = document.getElementById(iFrameId);
			let rect = elem.getBoundingClientRect(); //note: y posn is negative when scrolled off screen
			let adjScroll = rect.y - scrollWiggleRoom; //subtract some wiggle room to iFrame y posn (eg, it is "off screen" sooner now)
			let topElem = document.elementFromPoint(rect.left, rect.top); //get top most elem at iFrame posn
			if(elem && topElem && !elem.isSameNode(topElem)) { //if not the same elem then something is overlapping iFrame (eg, a header)
				overlappingElemHeight = topElem.getBoundingClientRect().height; //get the height of the overlapping elem
			} else if(topElem) { //if they are the same node, set back to 0
				overlappingElemHeight = 0;
			}
			adjScroll -= overlappingElemHeight; //subtract the overlapping height, making the iFrame "off screen" sooner since the header covers it
			adjScroll = 0 - adjScroll; //off screen values are negative; send as positive values for Pro components to adjust their posn
			adjScroll >= 0 && window[iFrameId].contentWindow.postMessage('{"type": "scroll", "data": "' + adjScroll + '"}', "*");
			// adjustHeight(iFrameId);
		});
	};

	function sendMessage(targetId, obj) {
		let frameId = targetId && iFrameId(targetId);
		if(obj && frameId && window.frames && window.frames[frameId] && window.frames[frameId].contentWindow) {
			return window.frames[frameId].contentWindow.postMessage(JSON.stringify(obj), "*");
		}
	}

	var create = function(
		url, comptype, targetId, sessionId, instId, itemId, queryId, itemTypeId,
		dynamicSizing, internalScroll, allowEventCreation, scrollManager, embeddedConfigToken
	) {
		dynamicSizing = coalesce(dynamicSizing, true);
		internalScroll = coalesce(internalScroll, false);
		var sourceUrl = getSourceUrl(url, comptype, instId, itemId, queryId, itemTypeId, sessionId, allowEventCreation, embeddedConfigToken);
		setCookie(sessionId);
		dynamicSizing && registerHeightManager(iFrameId(targetId));
		scrollManager && registerScrollToManager(iFrameId(targetId));
		attachIFrame(createIFrame(targetId, sourceUrl, internalScroll), targetId);
	};

	var createItemOrQueryFactory = function (url, comptype, scrollManager, isItem) {
		return function(targetId, sessionId, instId, someId, itemTypeId, dynamicSizing, internalScroll, allowEventCreation) {
			create(url, comptype, targetId, sessionId, instId, isItem ? someId : null, isItem ? null : someId, itemTypeId, dynamicSizing, internalScroll, allowEventCreation, scrollManager);
		};
	};

	var createFactory = function (url, scrollManager, allowEventCreation) {
		return function(targetId, sessionId, instId, dynamicSizing, internalScroll) {
			create(url, null, targetId, sessionId, instId, null, null, null, dynamicSizing, internalScroll, allowEventCreation, scrollManager);
		};
	};

	var createConfigTokenFactory = function (instId, embeddedConfigToken) {
		let url = "https://gauss.unival.com/25power-dev/" + instId + "/run/embedded/config.json?token=" + embeddedConfigToken;
		return httpGet(url, function (resp) {
			let json = JSON.parse(resp.responseText.replace(")]}',", ""));
			if(json && json.config) {
				let c = json.config;
				c.allowEventCreation = (["event-form", "express"].indexOf(c.embeddedType) > -1 ? "T" : c.allowEventCreation);
				return create(
					c.url, c.comptype, c.targetId, "", c.instId, c.itemId, c.queryId, c.itemTypeId, true, false,
					c.allowEventCreation === "T", true, embeddedConfigToken
				);
			}
		});
	};

	embedded25.express = {
		create: createFactory("/embedded/express", true, true)
	};

	embedded25.calendar = {
		createFromItem: createItemOrQueryFactory("/embedded/calendar", "calendar", false, true),
		createFromQuery: createItemOrQueryFactory("/embedded/calendar", "calendar", false, false)
	};

    embedded25.availability = {
		createFromItem: createItemOrQueryFactory("/embedded/availability", "availability_daily", false, true),
		createFromQuery: createItemOrQueryFactory("/embedded/availability", "availability", false, false)
    };

	embedded25.availabilityWeekly = {
		createFromItem: createItemOrQueryFactory("/embedded/availability-weekly", null, false, true),
		createFromQuery: createItemOrQueryFactory("/embedded/availability-weekly-mult-loc", null, false, false)
	};

	embedded25.rose = {
		create: createFactory("/embedded/rose", true, true)
	};

	embedded25.fromConfig = {
		create: function (instId, embeddedConfigToken) {
			return createConfigTokenFactory(instId, embeddedConfigToken);
		}
	};

	embedded25.updateItem = function (targetId, itemId) {
		return sendMessage(targetId, {type: "updateItem", itemId: itemId});
	};

	embedded25.updateQuery = function (targetId, queryId) {
		return sendMessage(targetId, {type: "updateQuery", queryId: queryId});
	};

}(window.embedded25 = window.embedded25 || {}));