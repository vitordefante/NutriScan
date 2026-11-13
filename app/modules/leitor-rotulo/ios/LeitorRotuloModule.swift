import ExpoModulesCore
import UIKit
import Vision

/// Leitura de texto (OCR) de fotos de rótulos com o Apple Vision — gratuito e no próprio aparelho:
/// a foto não sai do iPhone, só o texto lido vai para a API.
public class LeitorRotuloModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LeitorRotulo")

    /// Lê o texto de uma imagem local (file://) e devolve uma entrada por linha reconhecida, com a
    /// posição normalizada (0–1, origem no canto superior esquerdo da foto já em pé). A posição é
    /// o que permite remontar as linhas da tabela nutricional (nome do nutriente → valores).
    AsyncFunction("lerTexto") { (uri: URL, promise: Promise) in
      guard let dados = try? Data(contentsOf: uri),
        let imagem = UIImage(data: dados),
        let cgImage = imagem.cgImage
      else {
        promise.reject("ERR_IMAGEM", "Não foi possível abrir a imagem.")
        return
      }

      let pedido = VNRecognizeTextRequest { pedido, erro in
        if let erro {
          promise.reject("ERR_OCR", erro.localizedDescription)
          return
        }
        let observacoes = pedido.results as? [VNRecognizedTextObservation] ?? []
        let linhas: [[String: Any]] = observacoes.compactMap { obs in
          guard let candidato = obs.topCandidates(1).first else { return nil }
          let caixa = obs.boundingBox  // origem no canto INFERIOR esquerdo
          return [
            "texto": candidato.string,
            "confianca": Double(candidato.confidence),
            "x": Double(caixa.minX),
            "y": Double(1 - caixa.maxY),
            "largura": Double(caixa.width),
            "altura": Double(caixa.height),
          ]
        }
        promise.resolve(linhas)
      }
      pedido.recognitionLevel = .accurate
      pedido.recognitionLanguages = ["pt-BR", "en-US"]
      pedido.usesLanguageCorrection = true

      // A câmera grava a foto "deitada" e marca a orientação nos metadados; o Vision precisa dela
      // para ler o texto na direção certa.
      let manipulador = VNImageRequestHandler(
        cgImage: cgImage, orientation: orientacao(imagem.imageOrientation))
      do {
        try manipulador.perform([pedido])
      } catch {
        promise.reject("ERR_OCR", error.localizedDescription)
      }
    }
  }
}

private func orientacao(_ o: UIImage.Orientation) -> CGImagePropertyOrientation {
  switch o {
  case .up: return .up
  case .down: return .down
  case .left: return .left
  case .right: return .right
  case .upMirrored: return .upMirrored
  case .downMirrored: return .downMirrored
  case .leftMirrored: return .leftMirrored
  case .rightMirrored: return .rightMirrored
  @unknown default: return .up
  }
}
