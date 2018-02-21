'use strict'

const uiFlashcardDoc = document._currentScript || document.currentScript;
const uiFlashcardTemplate = uiFlashcardDoc.ownerDocument.querySelector('#ui-flashcard-template-view');

class FlashcardViewController extends HTMLElement {

	static get observedAttributes(){
		return ["front", "back", "value", "face", "hidden", "flippable"];
	}

	constructor(model){
		super();
		this.state = {};
		this.state.connected = false;
		this.state.scale = 1;
		this.state.translateX = 0;
		this.state.rotateY = 0;
		//Keeps reference of events with bindings (so we can remove them)
		//see: https://stackoverflow.com/questions/11565471/removing-event-listener-which-was-added-with-bind
		this.event = {};
		this.view = {};
		this.model = model || {};

		const view = document.importNode(uiFlashcardTemplate.content, true);
		this.shadowRoot = this.attachShadow({mode: 'open'});
		this.shadowRoot.appendChild(view);
		this.dataController = new FlashcardDataController();
	}

	connectedCallback() {
		//Wire views here
		this.view.container = this.shadowRoot.querySelector('#container');
		this.view.content = this.shadowRoot.querySelector('#content');

		this.view.front = this.shadowRoot.querySelector('#front');
		this.view.frontName = this.shadowRoot.querySelector('#frontName');
		this.view.frontImage = this.shadowRoot.querySelector('#frontImage');
		this.view.frontDescription = this.shadowRoot.querySelector('#frontDescription');

		this.view.back = this.shadowRoot.querySelector('#back');
		this.view.backName = this.shadowRoot.querySelector('#backName');
		this.view.backImage = this.shadowRoot.querySelector('#backImage');
		this.view.backDescription = this.shadowRoot.querySelector('#backDescription');

		//whichever is hidden must be flipped
		if(this.face === "up"){ this.view.back.style.transform = "rotateY(180deg)"; }
		else if(this.face === "down") { this.view.front.style.transform = "rotateY(180deg)"; }

		//Reference events with bindings
		this.event.click = this._onClick.bind(this);
		this.view.container.addEventListener('click', this.event.click);

		this.state.connected = true;
		this._updateView();
		this._updateState();

	}

	adoptedCallback(){
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		switch(attrName){

			case 'value':
				if(newVal !== this.value){ this.value = JSON.parse(newVal); }
				break;

			case 'front':
				if(newVal !== this.front){ this.front = newVal; }
				break;

			case 'back':
				if(newVal !== this.back){ this.back = newVal; }
				break;

			case 'face':
				if(newVal !== this.face){ this.face = newVal; }
				break;

			case 'hidden':
				if(newVal !== this.hidden){ this.hidden = newVal; }
				break;

			case 'flippable':
				if(newVal !== this.flippable){ this.flippable = newVal; }
				break;

			default:
				console.warn(`ui-flashcard attribute ${attrName} is not handled, you should probably do that`);
		}
	}

	get shadowRoot(){return this._shadowRoot;}
	set shadowRoot(value){ this._shadowRoot = value}

	get value(){ return this.model; }
	set value(value){
		this.model = value;
		this._updateView();
	}

	get hidden(){ return this.state.hidden; }
	set hidden(value){
		if(this.getAttribute('hidden') !== value){
			this.setAttribute('hidden', value);
			return;
		}
		this.state.hidden = value === "true";
		this._updateState(this.state.hidden);
	}

	get front(){ return this.getAttribute("front"); }
	set front(value){
		if(this.getAttribute('front') !== value){
			this.setAttribute('front', value);
			return;
		}
		this._updateView();
	}

	get back(){ return this.getAttribute("back"); }
	set back(value){
		if(this.getAttribute('back') !== value){
			this.setAttribute('back', value);
			return;
		}
		this._updateView();
	}

	get face(){ return this.getAttribute("face"); }
	set face(value){
		if(this.getAttribute('face') !== value){
			this.setAttribute('face', value);
			return;
		}
		this.state.face = value;
		this._updateState(this.state.face);
	}

	get flippable(){ return this.state.flippable; }
	set flippable(value){
		if(this.getAttribute('flippable') !== value){
			this.setAttribute('flippable', value);
			return;
		}
		this.state.flippable = value === "true";
	}


	_updateView() {
		//No point in rendering if there isn't a model source, or a view on screen
		if(!this.model || !this.state || !this.state.connected){ return; }
		this.face === "up"?  this._updateFrontView() : this._updateBackView();
	}

	_updateFrontView(){
		this.view.front.hidden = false;
		this.view.back.hidden = true;

		switch(this.front){
			case "image":
				this.view.frontImage.src = this.model["image"];
				this.view.frontImage.hidden = false;
				this.view.frontDescription.hidden = true;
				this.view.frontName.hidden = true;
				break;
			case "description":
				this.view.frontDescription.innerHTML = this.model["description"];
				this.view.frontImage.hidden = true;
				this.view.frontDescription.hidden = false;
				this.view.frontName.hidden = true;
				break;
			case "name":
				this.view.frontName.innerHTML = this.model["name"];
				this.view.frontImage.hidden = true;
				this.view.frontDescription.hidden = true;
				this.view.frontName.hidden = false;
				break;
			default:
				console.error("Front of card has a property that is not yet handled:", this.front);
		}
	}

	_updateBackView(){
		this.view.front.hidden = true;
		this.view.back.hidden = false;

		switch(this.back){
			case "image":
				this.view.backImage.src = this.model["image"];
				this.view.backImage.hidden = false;
				this.view.backDescription.hidden = true;
				this.view.backName.hidden = true;
				break;
			case "description":
				this.view.backDescription.innerHTML = this.model["description"];
				this.view.backImage.hidden = true;
				this.view.backDescription.hidden = false;
				this.view.backName.hidden = true;
				break;
			case "name":
				this.view.backName.innerHTML = this.model["name"];
				this.view.backImage.hidden = true;
				this.view.backDescription.hidden = true;
				this.view.backName.hidden = false;
				break;
			default:
				console.error("Back of card has a property that is not yet handled:", this.back);
		}
	}

	_onClick(e){
		e.stopPropagation();
		if(this.flippable){ this.flip(); }
		this.dispatchEvent(new CustomEvent('click', {detail: this.model}));
	}

	flip(){
		if(this.state.flipping || this.flippable === false) return;
		else this.state.flipping = true;

		let card = this;
		card.view.container.removeEventListener('click', this.event.click);
		card.style.zIndex = "9000";

		function startFlip(){
			card.state.translateX -= 3;
			card.state.scale += 0.015;
			card.state.rotateY += 15;
			card.style.transform = `rotateY(${card.state.rotateY}deg) scale(${card.state.scale}) translateX(${card.state.translateX}px)`;
			if(card.state.rotateY % 90 === 0){ transitionState(); }
			else { window.requestAnimationFrame(startFlip); }
		}

		function transitionState(){
			card.style.zIndex = "9000";
			card.face = card.face === "up"? "down" : "up";
			card._updateState(card.state.face);
			window.requestAnimationFrame(endFlip);
		}

		function endFlip(){
			card.state.translateX += 3;
			card.state.scale -= 0.015;
			card.state.rotateY += 15;
			card.style.transform = `rotateY(${card.state.rotateY}deg) scale(${card.state.scale}) translateX(${card.state.translateX}px)`;
			if(card.state.rotateY % 180 !== 0){ window.requestAnimationFrame(endFlip); }
			else {
				card.view.container.addEventListener('click', card.event.click);
				card.style.zIndex = "0";
				card.state.flipping = false;
			}
		}

		window.requestAnimationFrame(startFlip);
	}


	_updateState(state){

		if(!this.state || !this.state.connected){ return; }

		//FACE
		const updateFaceState = () => {
			if(this.face === "down"){
				this._updateBackView();
			}
			else if(this.face === "up") {
				this._updateFrontView();
			}
		}

		//HIDDEN
		const updateHiddenState = () => {
			if(this.state.hidden){
				this.view.container.hidden = this.state.hidden;
			}
			else {
				this.removeAttribute("hidden");
				this.view.container.hidden = this.state.hidden;
			}
		}

		switch(state){

			case this.state.face:
				updateFaceState();
				break;

			case this.state.hidden:
				updateHiddenState();
				break;

			default:
				updateFaceState();
				updateHiddenState();
		}
	}

	disconnectedCallback() {
		this._removeEvents()
		this.state.connected = false;
	}

	_removeEvents(){
		this.view.container.removeEventListener('click', this.event.click);
	}

}

window.customElements.define('ui-flashcard', FlashcardViewController);
