import { describe, suite, test } from "node:test";
import assert from "node:assert/strict";
import { Validator } from "../../main/ts/libs/Validator.ts";
suite("Validator test suite", () => {
    describe("Number validation tests", () => {
        const numberValidator = new Validator({
            version: "1.0",
            numberValidation: {
                integerMax: 318,
                integerMin: 6,
                floatMax: 13.9,
                floatMin: -6.212
            }
        });
        const smallInt: number = 5;
        const largeInt: number = 320;
        const smallFloat = -2 * Math.PI * Math.SQRT2;
        const largeFloat = Math.exp(10);

        test("an integer below the minimum is not valid", () => {
            assert.strictEqual("number", typeof smallInt);
            assert.equal(true, Number.isInteger(smallInt));
            assert.notEqual(true, numberValidator.numberValidate(smallInt));
        });
        test("an integer above the maximum is not valid", () => {
            assert.strictEqual("number", typeof largeInt);
            assert.equal(true, Number.isInteger(largeInt));
            assert.notEqual(true, numberValidator.numberValidate(largeInt));
        });
        test("a float below the minimum is not valid", () => {
            assert.strictEqual("number", typeof smallFloat);
            assert.equal(true, Number.isFinite(smallFloat));
            assert.equal(true, !Number.isInteger(smallFloat));
            assert.notEqual(true, numberValidator.numberValidate(smallFloat));
        });
        test("a float above the maximum is not valid", () => {
            assert.strictEqual("number", typeof largeFloat);
            assert.equal(true, Number.isFinite(largeFloat));
            assert.equal(true, !Number.isInteger(largeFloat));
            assert.notEqual(true, numberValidator.numberValidate(largeFloat));
        });
        test("an integer within the range is valid", () => {
            assert.equal(numberValidator.numberValidate(100), true);
        });
        test("a float within the range is valid", () => {
            assert.equal(numberValidator.numberValidate(5.5), true);
        });
        test("the integer bounds are exclusive: the min and max themselves are not valid", () => {
            assert.equal(numberValidator.numberValidate(6), false);
            assert.equal(numberValidator.numberValidate(318), false);
        });
        test("the integers just inside the bounds are valid", () => {
            assert.equal(numberValidator.numberValidate(7), true);
            assert.equal(numberValidator.numberValidate(317), true);
        });
        test("the float bounds are exclusive: the min and max themselves are not valid", () => {
            assert.equal(numberValidator.numberValidate(-6.212), false);
            assert.equal(numberValidator.numberValidate(13.9), false);
        });
        test("the floats just inside the bounds are valid", () => {
            assert.equal(numberValidator.numberValidate(-6.2), true);
            assert.equal(numberValidator.numberValidate(13.8), true);
        });
        test("a whole-valued float is treated as an integer, not a float", () => {
            // Number.isInteger(10.0) is true, so 10.0 is checked against the
            // integer bounds (6..318), where it is valid — not the float bounds.
            assert.equal(numberValidator.numberValidate(10.0), true);
        });
        test("NaN is not valid", () => {
            assert.equal(numberValidator.numberValidate(NaN), false);
        });
        test("Infinity and -Infinity are not valid", () => {
            assert.equal(numberValidator.numberValidate(Infinity), false);
            assert.equal(numberValidator.numberValidate(-Infinity), false);
        });
    });
    describe("Validator for html stripping", () => {
        test("replaces every HTML-significant character with its placeholder token", () => {
            const html = `<strong>Test&apos;&nbsp;</strong>`;
            const validator = new Validator();
            assert.equal(typeof html, 'string');
            const output = validator.stripHtml(html);
            assert.strictEqual(output, "{less_than}strong{greater_than}Test{ampersand}apos{semicolon}{ampersand}nbsp{semicolon}{less_than}{solidus}strong{greater_than}");
        });
        test("replaces a literal double quote with the inch_mark token", () => {
            const validator = new Validator();
            assert.strictEqual(validator.stripHtml('"'), "{inch_mark}");
        });
        test("replaces a literal single quote with the foot_mark token", () => {
            const validator = new Validator();
            assert.strictEqual(validator.stripHtml("'"), "{foot_mark}");
        });
        test("throws a TypeError for a non-string input", () => {
            const validator = new Validator();
            // @ts-expect-error deliberately passing a non-string to exercise the guard
            assert.throws(() => validator.stripHtml(42), TypeError);
        });
    });
    describe("Validator for String lengths", () => {
        test("a short string is not valid", () => {
            const validator = new Validator();
            assert.equal(validator.stringValidate("a"), false);
        });
        test("a generic string within bounds is valid", () => {
            const validator = new Validator();
            const input = "Tempor minim deserunt est velit do minim occaecat dolore dolor amet.";
            assert.equal(validator.stringValidate(input), true);
        });
        test("a very long (581-character) string is not valid", () => {
            const validator = new Validator();
            const input = `Exercitation amet mollit ad exercitation nulla occaecat quis et sunt laboris. Irure minim veniam esse ex veniam. Ea sit anim labore consectetur dolor cillum officia cupidatat. Ea sunt duis quis.
    Deserunt sunt duis ea reprehenderit. Dolor laboris nostrud voluptate ex excepteur. Tempor consectetur est in duis irure enim sint et proident sunt anim. Aliquip nisi amet Lorem minim sit nulla mollit in ad consectetur. Nisi enim ad nulla eiusmod tempor cillum cupidatat quis est aliquip sint incididunt sit. Qui ea id excepteur in qui sunt amet et laborum ad consequat duis in ullamco.`;
            assert.equal(validator.stringValidate(input), false);
        });
        test("a string at exactly the minimum length is valid", () => {
            const validator = new Validator();
            // Default bounds are min 2 / max 255; the bounds are inclusive.
            assert.equal(validator.stringValidate("ab"), true);
        });
        test("a string at exactly the maximum length is valid", () => {
            const validator = new Validator();
            assert.equal(validator.stringValidate("x".repeat(255)), true);
        });
        test("a string one over the maximum length is not valid", () => {
            const validator = new Validator();
            assert.equal(validator.stringValidate("x".repeat(256)), false);
        });
        test("throws a TypeError for a non-string input", () => {
            const validator = new Validator();
            // @ts-expect-error deliberately passing a non-string to exercise the guard
            assert.throws(() => validator.stringValidate(42), TypeError);
        });
    });
    describe("Email Validation Suite", () => {
        const validEntries = [
            { entry: "Simple address", input: "user@example.com" },
            { entry: "Subdomain host", input: "user@sub.example.com" },
            { entry: "Plus addressing", input: "user.name+tag@example.co.uk" }
        ];
        for (const { entry, input } of validEntries) {
            test(`valid email format: ${entry}`, () => {
                const validator = new Validator();
                assert.equal(validator.emailValidate(input), true);
            });
        }

        const badEntries = [
            { entry: "No @symbol", input: "invalid-email", expected: TypeError },
            { entry: "No Toplevel domain", input: "bad@domain", expected: TypeError },
            { entry: "Number", input: 42, expected: TypeError },
            { entry: "String is a space", input: " ", expected: TypeError }
        ];
        for (const { entry, input, expected } of badEntries) {
            test(`bad email format throws: ${entry}`, () => {
                const validator = new Validator();
                assert.throws(() => { validator.emailValidate(input as string); }, expected);
            });
        }
        test("an empty string throws a TypeError via the length guard", () => {
            // Distinct branch from a regex failure: rejected on length === 0.
            const validator = new Validator();
            assert.throws(() => validator.emailValidate(""), TypeError);
        });
    });
});
