import { describe, it, test } from "node:test";
import { Validator } from "../../main/ts/libs/Validator.ts";
import assert, { AssertionError } from "node:assert/strict";

describe("Validator for html stripping", ()=>{
    const html = `<strong>Test&apos;&nbsp;</strong>`;
    let output = "";
    const v = new Validator();
    it("is a string", ()=>{
        assert.equal(typeof html, 'string');
        output = v.stripHtml(html);
    });
    test("Expected output", ()=>{
        assert.strictEqual(output, "{less_than}strong{greater_than}Test{ampersand}apos{semicolon}{ampersand}nbsp{semicolon}{less_than}{solidus}strong{greater_than}");
    });
});
describe("Validator for String lengths", () => {
    it("This is a short string", () => {
        const input = "a";
        const v = new Validator();
        test("And results in not valid", () => {
            assert.equal(v.stringValidate(input), false )
        });
    });
    it("Is a generic string", () => {
        const input = "Tempor minim deserunt est velit do minim occaecat dolore dolor amet."
        const v = new Validator();
        test("And the result is valid", () => {
            assert.equal(v.stringValidate(input), true );
        });
    });
    it(`This is a very long string ${581} characters`, () => {
        const input = `Exercitation amet mollit ad exercitation nulla occaecat quis et sunt laboris. Irure minim veniam esse ex veniam. Ea sit anim labore consectetur dolor cillum officia cupidatat. Ea sunt duis quis.
Deserunt sunt duis ea reprehenderit. Dolor laboris nostrud voluptate ex excepteur. Tempor consectetur est in duis irure enim sint et proident sunt anim. Aliquip nisi amet Lorem minim sit nulla mollit in ad consectetur. Nisi enim ad nulla eiusmod tempor cillum cupidatat quis est aliquip sint incididunt sit. Qui ea id excepteur in qui sunt amet et laborum ad consequat duis in ullamco.`;
        const v = new Validator();
        test("And results in not valid", () => {
            assert.equal(v.stringValidate(input), false )
        });
    });
});
describe("Email Validation Suite", () => {
    it("This is a valid email", () => {
        const testEmail = "user@example.com";
        const v = new Validator();
        test("It should pass", () => {
            assert.equal(v.emailValidate(testEmail), true);
        });
    });
    it("Will test an array of bad email formats", () => {
        const entries = [
        {entry: "No @symbol", input: "invalid-email", expected: TypeError},
        {entry: "No Toplevel domain", input: "bad@domain", expected: TypeError},
        {entry: "Number", input: 42, expect: TypeError},
        {entry: "String is a space", input: " ", expect: AssertionError}
        ];
        for (const {entry, input} of entries) {
            const v = new Validator();

            test(entry, () => {
                assert.throws(()=>{v.emailValidate(input as string)}, TypeError)
            });
        }
    });
});
