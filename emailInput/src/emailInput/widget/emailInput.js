define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "mxui/dom",
    "dojo/dom",
    "dojo/dom-attr",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",
    "lib/mailcheck"

], function (declare, _WidgetBase, dom, dojoDom, domAttr, dojoProp, dojoGeometry, dojoClass, dojoStyle, domConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoEvent, mailcheck) {
    "use strict";

    var add = domConstruct.place();
    var create = domConstruct.create();
    var change =  domAttr.set();
    var destroy = domConstruct.destroy();
    var hitch = dojoLang.hitch();

    return declare("emailInput.widget.emailInput", [ _WidgetBase ], {

        // Setup internal event binding variables.
        _handles: null,
        _contextObj: null,
        _uid: "",

        // Setup DOM node variables
        _widgetNode: null,
        _labelNode: null,
        _inputGroupNode: null,
        _addonNode: null,
        _inputNode: null,
        _inputValidationMessageNode: null,
        _inputHelperNode: null,
        _verificationNode: null,
        _verificationHelperNode: null,
        _verificationValidationMessageNode: null,

        /* INFO: Widget setup from modeller
         ----------------------------------------------------------------------------------------------------------------
         Entity & attribute references:
         this.email (main email entity)
         this.constraint (constraint on the main entity)
         this.emailAddress (email address attribute)
         this.showInputHelper (attribute that can dynamically toggle the visibility of the helper text underneath the input field)
         this.inputHelper (attribute that contains the helper text, will be displayed underneath the input field and can be used for instructions or explaining what the email will be used for)
         this.verificationCode (attribute used to compare the verification code that was sent to the user)
         this.verified (email address was verified true/false)

         Display attributes:
         this.formOrientation (horizontal / vertical display of the input field + optional label)
         this.displayLabel (show the label true/false)
         this.labelWidth
         this.labelText
         this.inputAddonWidth
         this.inputAddon (icon/text/none)
         this.inputAddonText (text to use for the input add-on)
         this.inputWidth
         this.placeholderText (placeholder text for the input field)
         this.showInputHelper
         this.inputHelper
         this.sendEmailVerificationButtonText

         Validation attributes and microflows:
         this.verificationRequired (verification is required for this input to be valid true/false)
         this.sendEmailVerificationMicroflow (microflow reference which will send a verification to the given email)
         this.verificationCode (attribute used to compare the verification code that was sent to the user)
         this.verifyEmailMicroflow (microflow that is used to compare the given verification code by the user with the one that was sent)
         this.verified (email address was verified true/false)
         this.validationEmailMicroflow (microflow that is used to validate the entered email can be used for custom validations like a Regex, existing email address etc.)
         this.toLowerCase (automatically transform entered characters to lower-case)
         this.maxLength (max length of the input field)
         this.translatableLengthValidationMessage(validation message to show when the max-length attribute is exceeded while typing the email address)
         this.domains
         this.topLevelDomains
         */

        // Initialize internal widget variables
        constructor: function () {
            this._handles = [];
            this._uid = _WidgetBase.uniqueid;
        },


        postCreate: function () {
            logger.debug(this.id + ".postCreate");
        },

        update: function (obj, callback) {
            logger.debug(this.id + ".update");
            this._contextObj = obj;
            this._resetSubscriptions();
            this._updateRendering(callback);
        },

        resize: function(box) {
            logger.debug(this.id + ".resize");
        },

        uninitialize: function () {
            logger.debug(this.id + ".uninitialize");
            destroy(this._widgetNode);
        },

        _updateRendering: function (callback) {
            logger.debug(this.id + "._updateRendering");
            if (this._contextObj !== null) {
                // Create the widget DOM
                this._widgetConstructor();
                this._labelConstructor();
                this._inputAddonConstructor();
                this._inputConstructor();
            } else {
                // If no context for widget destroy all elements
                destroy(this._widgetNode);
            }
            // Clear the validation messages on update of the widget
            this._clearValidations();
        },

        /* Widget DOM generation functions
        ----------------------------------------------------------------------------------------------------------------
        */

        // Generates <div class="form-group"></div>
        _widgetConstructor: function(){
            this._widgetNode = create("div",{"class": "form-group"},this.domNode);
        },

        // Generates <label id="widgetUniqueID-label" for="widgetUniqueID-input" class="control-label col-width-#-classes">Label text</label>
        _labelConstructor: function(){
            if (this.displayLabel) {
                if (this.formOrientation === "vertical") {
                    this._labelNode = create("label", {
                        "id": this._uid + "-label",
                        "for": this._uid + "-input",
                        "class": "control-label col-xs-12 col-sm-12 col-md-12 col-lg-12 col-xl-12",
                        "innerHTML": this.labelText
                    }, this._widgetNode, "first")
                } else{
                    this._labelNode = create("label", {
                        "id": this._uid + "-label",
                        "for": this._uid + "-input",
                        "class": "control-label " + this.labelWidth,
                        "innerHTML": this.labelText
                    }, this._widgetNode, "first")
                }
            } else {
                this._labelNode = null;
            }
        },

        _inputAddonConstructor: function(){
            if (!this.inputAddon == "disabledInputGroupAddon"){
                this._inputGroupNode = create("div", {"class":"input-group"},this._widgetNode);
                if (this.inputAddon === "text") {
                    this._addonNode = create("span", {
                        "id": this._uid + "-addon",
                        "class": "input-group-addon"+ this.inputAddonWidth,
                        "innerHTML": this.inputAddonText
                    }, _inputGroupNode, "first");
                } else if (this.inputAddon === "icon"){
                    this._addonNode = create("span", {
                        "id": this._uid + "-addon",
                        "class": "input-group-addon glyphicon glyphicon-envelope" + this.inputAddonWidth,
                    }, _inputGroupNode, "first");
                }
            } else
                this._inputGroupNode = null;
                this._addonNode = null;
        },

        _inputConstructor: function() {
            var inputTarget = null;
            var insertLocation = "";
            var description = "";

            if (!this.inputAddon == "disabledInputGroupAddon") {
                inputTarget = this._addonNode;
                insertLocation = "after";
            } else {
                if (this.displayLabel) {
                    inputTarget = this._labelNode;
                    insertLocation = "after";
                } else {
                    inputTarget = this._widgetNode;
                    insertLocation = "first";
                }
            }

            if (this.showInputHelper) {
                description = this.labelText + " " + this.inputHelper
            } else {
                description = this.labelText
            }

            create("input", {
                    "class": "form-control",
                    "id": this._uid + "-input",
                    "type": "email",
                    "placeholder": this.placeholderText,
                    "title": this.placeholderText,
                    "aria-label": description,
                    "value": this.emailAddress,
                }, inputTarget, insertLocation
            )
        },

        _inputHelperConstructor: function(){

        },

        // Generic functionality for showing validation messages to the user
        _throwValidationError: function (message) {
            if (this._validationMessageNode !== null) {
                change(this._validationMessageNode,"innerHTML", message);
            } else {
                this._validationMessageNode = create("div", {
                    'class': 'alert alert-danger',
                    'innerHTML': message
                }, this._inputNode, "after");
            }
        },

        // Validation handling of the input field
        _clearValidationMessages: function(){
            destroy(this._validationMessageNode);
            this._validationMessageNode = null;
        },

        // Reset subscriptions.
        _resetSubscriptions: function () {
            var _contextObjHandle = null,
                _emailAddressAttrHandle = null,

                _validationHandle = null;
            // Release handles on previous the previous context object, if this existed.
            if (this._handles) {
                this._handles.forEach(function (handle, i) {
                    mx.data.unsubscribe(handle);
                });
                this._handles = [];
            }
            // When a Mendix context object exists create the subscribtions.
            if (this._contextObj) {
                //Subscribe to context object changes and refreshes
                _contextObjHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: hitch(this, function (guid) {
                        this._updateRendering();
                    })
                });
                _emailAddressAttrHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this.emailAddress,
                    callback: hitch(this, function (guid, attr, attrValue) {
                        this._updateRendering();
                    })
                });
                _validationHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: hitch(this, this._handleValidation)
                });
                this._handles = [_objectHandle, _emailAddressAttrHandle, _validationHandle];
            }
        }

    });
});

require(["emailInput/widget/emailInput"]);
