Pod::Spec.new do |s|
  s.name           = 'LeitorRotulo'
  s.version        = '0.1.0'
  s.summary        = 'OCR de rótulos com o Apple Vision'
  s.description    = 'Lê o texto de fotos de rótulos no próprio aparelho, com a posição de cada linha.'
  s.author         = 'NutriScan'
  s.homepage       = 'https://github.com/vitordefante/NutriScan'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
