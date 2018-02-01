'use strict'

const uiFlashcardDoc = document._currentScript || document.currentScript;
const uiFlashcardTemplate = uiFlashcardDoc.ownerDocument.querySelector('#ui-flashcard-template-view');

class FlashcardViewController extends HTMLElement {

	static get observedAttributes(){
		return ["front", "back", "value", "face"];
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
		else { this.view.front.style.transform = "rotateY(180deg)"; }

		//Reference events with bindings
		this.event.click = this._onClick.bind(this);
		this.view.container.addEventListener('click', this.event.click);

		this.state.connected = true;
		this._updateView(this.view);
		this._updateState();
	}

	adoptedCallback(){
		console.log('adoptedCallback');
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


			default:
				console.warn(`Attribute ${attrName} is not handled, you should probably do that`);
		}
	}

	get shadowRoot(){return this._shadowRoot;}
	set shadowRoot(value){ this._shadowRoot = value}

	get value(){ return this.model; }
	set value(value){
		this.model = value;
		this._updateView(this.view);
	}

	get front(){ return this.state.front; }
	set front(value){
		if(this.getAttribute('front') !== value){
			this.setAttribute('front', value);
			return;
		}
		this.state.front = this.model[value];
		this._updateView(this.view.front);
	}

	get back(){ return this.state.back; }
	set back(value){
		if(this.getAttribute('back') !== value){
			this.setAttribute('back', value);
			return;
		}
		this.state.back = this.model[value];
		this._updateView(this.view.back);
	}

	get face(){ return this.state.face; }
	set face(value){
		if(this.getAttribute('face') !== value){
			this.setAttribute('face', value);
			return;
		}
		this.state.face = value;
		this._updateState();
	}


	_updateView(view) {
		//No point in rendering if there isn't a model source, or a view on screen
		if(!this.model || !this.state || !this.state.connected){ return; }

		switch(view){
			case this.view.front:
				this._updateFrontView();
				break;
			case this.view.back:
				this._updateBackView();
				break;
			case this.view:
				this._updateFrontView();
				this._updateBackView();
				break;
		}
	}

	_updateFrontView(){
		const isURL = FlashcardDataController.isURL(this.front);
		const isString = FlashcardDataController.isString(this.front);
		const isLong = this.front.length > 20;

		if(isURL){
			this.view.frontImage.src = this.front;
			this.view.frontImage.hidden = false;
			this.view.frontDescription.hidden = true;
			this.view.frontName.hidden = true;
		}
		else if(isString && isLong) {
			this.view.frontDescription.innerHTML = this.front;
			this.view.frontImage.hidden = true;
			this.view.frontDescription.hidden = false;
			this.view.frontName.hidden = true;
		}
		else if(isString) {
			this.view.frontName.innerHTML = this.front;
			this.view.frontImage.hidden = true;
			this.view.frontDescription.hidden = true;
			this.view.frontName.hidden = false;
		}

	}

	_updateBackView(){
		const isURL = FlashcardDataController.isURL(this.back);
		const isString = FlashcardDataController.isString(this.back);
		const isLong = this.back.length > 20;

		if(isURL){
			this.view.backImage.src = this.back;
			this.view.backImage.hidden = false;
			this.view.backDescription.hidden = true;
			this.view.backName.hidden = true;
		}
		else if(isString && isLong) {
			this.view.backDescription.innerHTML = this.back;
			this.view.backImage.hidden = true;
			this.view.backDescription.hidden = false;
			this.view.backName.hidden = true;
		}
		else if(isString) {
			this.view.backName.innerHTML = this.back;
			this.view.backImage.hidden = true;
			this.view.backDescription.hidden = true;
			this.view.backName.hidden = false;
		}


	}

	_onClick(e){
		this.flip();
		this.dispatchEvent(new CustomEvent('custom-click', {detail: this.model}));
	}

	flip(){


		let card = this;
		card.view.container.removeEventListener('click', this.event.click);
		card.style.zIndex = "9000";

		function startFlip(){
			card.state.translateX -= 3;
			card.state.scale += 0.011;
			card.state.rotateY += 5;
			card.style.transform = `rotateY(${card.state.rotateY}deg) scale(${card.state.scale}) translateX(${card.state.translateX}px)`;
			if(card.state.rotateY % 90 === 0){ transitionState(); }
			else { window.requestAnimationFrame(startFlip); }
		}

		function transitionState(){
			card.style.zIndex = "9000";
			card.state.face = card.state.face === "up"? "down" : "up";
			card._updateState();
			window.requestAnimationFrame(endFlip);
		}

		function endFlip(){
			card.state.translateX += 3;
			card.state.scale -= 0.011;
			card.state.rotateY += 5;
			card.style.transform = `rotateY(${card.state.rotateY}deg) scale(${card.state.scale}) translateX(${card.state.translateX}px)`;
			if(card.state.rotateY % 180 !== 0){ window.requestAnimationFrame(endFlip); }
			else {
				card.view.container.addEventListener('click', card.event.click);
				card.style.zIndex = "0";
			}
		}

		window.requestAnimationFrame(startFlip);
	}


	_updateState(){

		if(!this.state || !this.state.connected){ return; }

		switch(this.face){
			case "down":
				this.view.front.hidden = true;
				this.view.back.hidden = false;
				break;

			case "up":
				this.view.front.hidden = false;
				this.view.back.hidden = true;
				break;
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
