# Contributing to MD2WA

Thank you for considering contributing to MD2WA! 🎉

## How to Contribute

### Reporting Bugs
- Check if the issue already exists
- Create a new issue with a clear description
- Include steps to reproduce the bug

### Suggesting Features
- Open an issue with the `enhancement` label
- Describe the feature and its use case

### Pull Requests
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test locally by opening `index.html` in a browser
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Code Style

- Use 4-space indentation
- Add comments for complex regex patterns
- Keep functions focused and small
- Test with various markdown inputs from different LLMs

## Adding New Conversion Rules

Rules are defined in `app.js` in the `conversionRules` array:

```javascript
{
    name: 'ruleName',
    pattern: /regex/g,
    replacement: 'replacement'
}
```

**Important:** Rule order matters! Some patterns must be processed before others.

## Testing

1. Open `index.html` in a browser
2. Paste markdown from ChatGPT, Claude, Gemini, or Perplexity
3. Click "Proses" and verify the output

## Questions?

Feel free to open an issue for any questions.
