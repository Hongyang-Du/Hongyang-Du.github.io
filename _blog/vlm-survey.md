---
title:          "How AI Learns to See and Talk"
date:           2025-01-04
cover:          /assets/images/covers/cover3.png
description: >-
  Inside the bridge between pixels and words.
scripts:
  - /assets/js/blog/viz.js
  - /assets/js/blog/vlm-guide.js
---

Show a photo to GPT-4o, Claude, or Gemini and it can answer questions about the scene in plain sentences. Yet under the hood, a language model only reads text tokens, while a photo is just a grid of colored pixels.

How do you wire pixels into a model built for words? Play with the figures below to trace the path from raw image patches to generated answers.

## 1. Turning an Image into Tokens

A language model reads a sentence as a 1D sequence of **tokens** (words or word pieces). To feed an image into a similar model, we first convert the 2D image into a sequence as well.

Vision Transformers (ViT) do this by cutting the image into a grid of small square **patches** and arranging them row by row:

<div id="vlm-patches"></div>

A **vision encoder** then converts each patch into a vector of numbers (an **embedding**) that represents its visual features, such as colors, textures, and object parts.

## 2. Aligning Images and Text in One Space

Even after patches and words become vectors, a vision model and a text model trained separately use completely different coordinate spaces. A vector for a cat photo has no connection to the vector for the word "cat".

**Contrastive learning**, the method behind **CLIP**, aligns them using millions of image-caption pairs from the web. During training, the model pulls matching image and caption vectors closer together and pushes mismatched pairs apart. Click **Train** below to watch this shared space form:

<div id="vlm-contrastive"></div>

Once images and text share the same feature space, the model can classify new images zero-shot by checking which text description sits closest to the image vector.

## 3. Connecting a Vision Encoder to an LLM

CLIP is great at matching images with text, while an LLM is built to reason and write sentences. Most modern VLMs (such as LLaVA) combine a pretrained vision encoder with a pretrained LLM through a small **projector** network:

<div id="vlm-pipeline"></div>

The projector is often just one or two neural network layers. It maps visual features from the vision encoder into the LLM's own token embedding space. After projection, visual tokens and text question tokens are placed into a single sequence for the LLM to read together. Reusing a strong vision encoder and LLM makes training much cheaper than building a multimodal model from scratch.

## 4. Generating Answers Word by Word

After processing the image tokens and question tokens, the LLM writes its answer one token at a time.

At each step, the model's final layer (the **output head**) converts its current hidden state into a score for every word in its vocabulary. Those scores become probabilities, and the model samples one word, appends it to the sequence, and repeats until the sentence ends:

<div id="vlm-head"></div>

**Temperature** controls how sharp or flat this probability distribution is. Lower temperature makes the model consistently pick top-scoring words, while higher temperature gives lower-probability words a bigger chance.

## 5. Grounding Words in Image Regions with Attention

Inside the Transformer, **attention** allows each generated word to look back at all earlier tokens, including the image patches. When writing an object word like "cat" or "ball", the model puts higher attention weight on the patches containing that object:

<div id="vlm-attention"></div>

We do not supervise these attention maps with manual bounding boxes. The model learns where to look automatically from training on image-text conversations.

## Three Common VLM Architectures

Most vision-language models today follow one of three designs: dual encoders for matching and search, a vision encoder connected to an LLM via a projector, or a single unified model that treats both images and text as tokens.

<div id="vlm-recipes"></div>

## Why Models Hallucinate

Connecting a vision encoder to a pretrained LLM comes with a well-known failure mode: **hallucination**, where the model confidently describes objects that are not in the image.

Because the LLM read billions of text sentences during pretraining, it has strong language priors (for instance, "cat" and "dog" often appear together in text). When the model relies too much on text patterns instead of the visual tokens, those priors override what is actually in the photo:

<div id="vlm-hallucination"></div>

Reducing hallucination, improving multimodal safety, and lowering training costs remain major open topics in VLM research.

## Further Reading

For a broader review of VLM architectures, alignment methods, benchmarks, and open challenges, see our survey paper and paper list:

- **Paper:** [A Survey of State of the Art Large Vision Language Models](https://openaccess.thecvf.com/content/CVPR2025W/TMM-OpenWorld/html/Li_A_Survey_of_State_of_the_Art_Large_Vision_Language_CVPRW_2025_paper.html) (CVPR 2025 Workshop, Oral) · [arXiv:2501.02189](https://arxiv.org/abs/2501.02189)
- **Papers and models:** [github.com/zli12321/Awesome-VLM-Papers-And-Models](https://github.com/zli12321/Awesome-VLM-Papers-And-Models)

Joint work with Zongxia Li, Xiyang Wu, Fuxiao Liu, Huy Nghiem, and Guangyao Shi.
