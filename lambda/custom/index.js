const Alexa = require('ask-sdk-core');

const WELCOME_MESSAGE = "Welcome to Corny Dad Quiz. I will read you a total of \
						 5 jokes. You will be able to guess the punch line for \
						 each. Are you ready?";
const HELP_MESSAGE = "I will read you a joke,\
                         and then you can guess the punch line. Are you ready?";
const GOODBYE_MESSAGE = "Thanks for playing, goodbye!";
const PLAY_AGAIN = "Would you like to play again?";
const BACKGROUND_IMAGE_URL = "http://ajotwani.s3.amazonaws.com/alexa/background.png";

/*TODO List =========================================>>>>>>>>>
  * Test display
  * Provide and change images
  * Move Jokes to jokes.js
  * Create function to shuffle and return 5 jokes
*/

const LaunchRequestHandler = {
	canHandle(handlerInput) {
		const request = handlerInput.requestEnvelope.request;
		return request.type === "LaunchRequest";
	},
	handle(handlerInput) {
		const speechOutput = WELCOME_MESSAGE;
		const repromptSpeechOutput = HELP_MESSAGE;
		var response = "";

		const attributes = handlerInput.attributesManager.getSessionAttributes();

		if (supportsDisplay(handlerInput)) {
			const display_type = "BodyTemplate7";
			const image_url = BACKGROUND_IMAGE_URL;
			response = getDisplay(handlerInput.responseBuilder, attributes, image_url, display_type);
		}
		else{
			response = handlerInput.responseBuilder;
		}

		return response
			.speak(speechOutput)
			.reprompt(repromptSpeechOutput)
			.getResponse();
	}
};

const JokeHandler = {
	canHandle(handlerInput) {
		const request = handlerInput.requestEnvelope.request;
		return request.type === "IntentRequest" &&
           (request.intent.name === "StartJokeIntent" ||
            request.intent.name === "AMAZON.StartOverIntent" ||
            request.intent.name === "AMAZON.YesIntent");
	},
	handle(handlerInput) {
		const joke = getNextJoke(handlerInput);
		const speechOutput = joke.question;

		const attributes = handlerInput.attributesManager.getSessionAttributes();
		var response = "";

		if (supportsDisplay(handlerInput)) {
			const image_url = attributes.lastQuestion.image;
			const display_type = "BodyTemplate2";
			response = getDisplay(handlerInput.responseBuilder, attributes, image_url, display_type);
		}
		else{
			response = handlerInput.responseBuilder;
		}

		return response
			.speak(speechOutput)
			.reprompt(speechOutput)
			.getResponse();
	}
};

const AnswerHandler = {
	canHandle(handlerInput) {
		const request = handlerInput.requestEnvelope.request;
		const attributes = handlerInput.attributesManager.getSessionAttributes();
		return request.type === "IntentRequest" &&
           request.intent.name === "AnswerIntent" &&
           attributes.counter < attributes.jokesDeck.length - 1; //TODO Set length to 5
	},
	handle(handlerInput) {
    	const attributes = handlerInput.attributesManager.getSessionAttributes();
		const answerSlot = handlerInput.requestEnvelope.request.intent.slots.answer.value;
    	const result = checkAnswer(handlerInput, answerSlot);
		const joke = getNextJoke(handlerInput);
		const speechOutput = result.message + " Here's your " + (attributes.counter + 1) + "th question - " + joke.question;

		var response = "";

		attributes.lastResult = result.message;
		handlerInput.attributesManager.setSessionAttributes(attributes);

		if (supportsDisplay(handlerInput)) {
			const image_url = attributes.lastQuestion.image;
			const display_type = "BodyTemplate2";
			response = getDisplay(handlerInput.responseBuilder, attributes, image_url, display_type);
		}
		else{
			response = handlerInput.responseBuilder;
		}

		return response
			.speak(speechOutput)
			.reprompt(speechOutput)
			.getResponse();
	}
};

const FinalScoreHandler = {
	canHandle(handlerInput) {
		const request = handlerInput.requestEnvelope.request;
		const attributes = handlerInput.attributesManager.getSessionAttributes();
		return request.type === "IntentRequest" &&
           request.intent.name === "AnswerIntent" &&
           attributes.counter == attributes.jokesDeck.length - 1;
	},
	handle(handlerInput) {
		const attributes = handlerInput.attributesManager.getSessionAttributes();
		const answerSlot = handlerInput.requestEnvelope.request.intent.slots.answer.value;
    	const result = checkAnswer(handlerInput, answerSlot);
		var response = "";

		attributes.lastResult = result.message;
		handlerInput.attributesManager.setSessionAttributes(attributes);
		if (supportsDisplay(handlerInput)) {
			const image_url = BACKGROUND_IMAGE_URL;
			const display_type = "BodyTemplate7";
			response = getDisplay(handlerInput.responseBuilder, attributes, image_url, display_type);
		}
		else{
			response = handlerInput.responseBuilder;
		}

		return response
			.speak(attributes.lastResult + " Thank you for playing Corny Dad Quiz. Your final score is " + attributes.correctCount + " out of " + (attributes.counter) + ".")
			.getResponse();
	}
};

const StopIntent = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(GOODBYE_MESSAGE)
      //.reprompt(speechOutput)
      .getResponse();
  },
};

const CancelIntent = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(GOODBYE_MESSAGE)
      .getResponse();
  },
};

const NoIntent = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(GOODBYE_MESSAGE)
      .getResponse();
  },
};

const ErrorHandler = {
  canHandle(handlerInput) {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const HelpHandler = {
  canHandle(handlerInput){
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput){
    return handlerInput.responseBuilder
      .speak(HELP_MESSAGE)
      .getResponse();
  }
};

// Helper Functions =====================================>>

// returns true if the skill is running on a device with a display (show|spot)
function supportsDisplay(handlerInput) {
	var hasDisplay =
	  handlerInput.requestEnvelope.context &&
	  handlerInput.requestEnvelope.context.System &&
	  handlerInput.requestEnvelope.context.System.device &&
	  handlerInput.requestEnvelope.context.System.device.supportedInterfaces &&
	  handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display;
	return hasDisplay;
  }

function getDisplay(response, attributes, image_url, display_type){
	const image = new Alexa.ImageHelper().addImageInstance(image_url).getImage();
	const current_score = attributes.correctCount;
	let display_score = "";
	console.log("the display type is => " + display_type);

	if (typeof attributes.correctCount !== 'undefined'){
		display_score = "Score: " + current_score;
	}
	else{
		display_score = "Score: 0. Let's get started!";
	}

	const myTextContent = new Alexa.RichTextContentHelper()
	.withPrimaryText('Question #' + (attributes.counter + 1) + "<br/>")
	.withSecondaryText(attributes.lastResult)
	.withTertiaryText("<br/> <font size='4'>" + display_score + "</font>")
	.getTextContent();

	if (display_type == "BodyTemplate7"){
		//use background image
		response.addRenderTemplateDirective({
			type: display_type,
			backButton: 'visible',
			backgroundImage: image,
			title:"Corny Dad",
			textContent: myTextContent,
			});
	}
	else{
		response.addRenderTemplateDirective({
			//use 340x340 image on the right with text on the left.
			type: display_type,
			backButton: 'visible',
			image: image,
			title:"Corny Dad",
			textContent: myTextContent,
			});
	}
	return response;
}

function getNextJoke(handlerInput){
	const attributes = handlerInput.attributesManager.getSessionAttributes();
	var jokesDeck = [];

	if (!attributes.counter){ //skill launched for first time - no counter set
		jokesDeck = shuffle(jokes);
		attributes.jokesDeck = jokesDeck;
		attributes.counter = 0;
		attributes.correctCount = 0;
		attributes.wrongCount = 0;
	}
	else{
		jokesDeck = attributes.jokesDeck;
	}

	const joke = jokesDeck[attributes.counter];
	attributes.lastQuestion = joke;
	handlerInput.attributesManager.setSessionAttributes(attributes);
	return joke;
}

function checkAnswer(handlerInput,answerSlot){
	const attributes = handlerInput.attributesManager.getSessionAttributes();
	var status = "";
	var message ="";

	if (attributes.lastQuestion.answer.includes(answerSlot)){// Keep answer as array to fuzz answers
		console.log("correct");
		message = "<audio src='soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_positive_response_01'/> Yes! " + upperFirstLetter(answerSlot) + " is correct. ";
		attributes.correctCount += 1;
		status = true;

	}
	else if (answerSlot == "I don't know"){
		console.log("i don't know");
		message = `The correct answer was ${attributes.lastQuestion.answer[0]}.`;
		attributes.wrongCount += 1;
		status = false;
	}
	else{
		console.log("wrong");
		message = `<audio src='soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_negative_response_01'/> Nope! ${upperFirstLetter(answerSlot)} is incorrect. The correct answer was \
              ${attributes.lastQuestion.answer[0]}.`;
		attributes.wrongCount += 1;
		status = false;
	}
	attributes.counter += 1;
	handlerInput.attributesManager.setSessionAttributes(attributes);
	return {"status":status,"message":message};
}

function shuffle(arr) {//TODO -- function is okay until the jokes array gets big
	var ctr = arr.length, temp, index;
	while (ctr > 0) {
		index = Math.floor(Math.random() * ctr);
		ctr--;
		temp = arr[ctr];
		arr[ctr] = arr[index];
		arr[index] = temp;
	}
	return arr;
}

function upperFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

const jokes = [//TODO move jokes to jokes.js
	{
		"question":"What looks like half a grapefruit?","answer":["the other half"],"image":"https://ajotwani.s3.amazonaws.com/alexa/winter2.png"
	},
	{
		"question":"What Kept the skunk from running out of the room?","answer":["the door"],"image":"https://ajotwani.s3.amazonaws.com/alexa/winter2.png"
	},
	{
		"question":"What causes trees to be so noisy?","answer":["their bark"],"image":"https://ajotwani.s3.amazonaws.com/alexa/travel2.png"
	},
	{
		"question":"What do you call a dirty deer who crosses the street twice?","answer":["a dirty double crosser"],"image":"https://ajotwani.s3.amazonaws.com/alexa/winter2.png"
	},
	{
		"question":"What do you do if you swallow a roll of film?","answer":["wait to see what develops"],"image":"https://ajotwani.s3.amazonaws.com/alexa/travel2.png"
	}
];

const skillBuilder = Alexa.SkillBuilders.custom();
exports.handler = skillBuilder
	.addRequestHandlers(
		LaunchRequestHandler,
		JokeHandler,
		AnswerHandler,
		FinalScoreHandler,
		NoIntent,
		CancelIntent,
		StopIntent,
		ErrorHandler,
	    HelpHandler
	)
	.lambda();
